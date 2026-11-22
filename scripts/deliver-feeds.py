#!/usr/bin/env python3
"""
Delivers a feed snapshot to every active subscriber, by the method and format each one chose.

Post-crawl hook (called by the crawl jobs):
  python3 /opt/proxora/scripts/deliver-feeds.py --feed mobilede \
    --snapshot /home/sftpuser/CAR/DE/Mobilede/mobilede_20261118 --file listings.jsonl

Connection test for one subscription (used by the dashboard's "Test connection" button):
  python3 /opt/proxora/scripts/deliver-feeds.py --test --subscription <uuid>
  Prints one JSON line: {"ok": true} or {"ok": false, "error": "..."}.

Methods: sftp, s3, gcs (S3-compatible HMAC keys), snowflake, webhook (signed, with a
time-limited download link), api (file kept for GET /v1/feeds/<id>/latest).
Formats: jsonl (as crawled), json, csv, parquet (needs pyarrow). Snowflake always loads JSON rows.

Settings come from the environment, then /opt/proxora/.env: DATABASE_URL, DELIVERY_SECRET_KEY,
DELIVERY_EXPORT_DIR, SITE_URL. Idempotent: a subscription with a 'delivered' log for the
snapshot date is skipped.
"""

import argparse
import base64
import csv
import hashlib
import hmac
import ipaddress
import json
import os
import re
import shutil
import socket
import sys
import time
import warnings
from datetime import date, datetime, timedelta, timezone

warnings.filterwarnings("ignore")

ENV_FILE = "/opt/proxora/.env"
EXPORT_KEEP_DAYS = 7
LINK_TTL_SECONDS = 7 * 24 * 3600
TEST_FILENAME = "veyora-connection-test.txt"
EXTENSIONS = {"jsonl": "jsonl", "json": "json", "csv": "csv", "parquet": "parquet"}


# ---------- settings and secrets ----------

def load_env():
    env = {}
    if os.path.exists(ENV_FILE):
        try:
            with open(ENV_FILE) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, _, v = line.partition("=")
                        env[k.strip()] = v.strip()
        except PermissionError:
            pass
    env.update({k: v for k, v in os.environ.items() if k in ("DATABASE_URL", "DELIVERY_SECRET_KEY", "DELIVERY_EXPORT_DIR", "SITE_URL")})
    return env


def parse_key(raw):
    raw = (raw or "").strip()
    if not raw:
        return None
    key = bytes.fromhex(raw) if re.fullmatch(r"[0-9a-fA-F]{64}", raw) else base64.b64decode(raw)
    if len(key) != 32:
        raise SystemExit("DELIVERY_SECRET_KEY must be 32 bytes")
    return key


def open_secret(key, sealed):
    """Same format as src/secret-box.js: "v1:" + base64(iv | ciphertext | tag)."""
    if not sealed:
        return ""
    if not sealed.startswith("v1:"):
        return sealed  # stored before encryption existed
    if key is None:
        raise RuntimeError("DELIVERY_SECRET_KEY is not set, so saved credentials cannot be read")
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    raw = base64.b64decode(sealed[3:])
    return AESGCM(key).decrypt(raw[:12], raw[12:], None).decode()


def link_key(key):
    return hmac.new(key, b"veyora-download-link", hashlib.sha256).digest()


def assert_public_host(host):
    """Re-checked at send time, so a hostname that later points inside our network is refused."""
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror:
        raise RuntimeError(f"Could not resolve {host}")
    for info in infos:
        address = ipaddress.ip_address(info[4][0])
        if not address.is_global:
            raise RuntimeError(f"{host} resolves to a private address")


# ---------- files and formats ----------

def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def find_data_file(snapshot_dir, filename):
    for candidate in (os.path.join(snapshot_dir, filename), os.path.join(snapshot_dir, "list", filename)):
        if os.path.isfile(candidate):
            return candidate
    return None


def iter_records(path):
    with open(path, "rb") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    yield json.loads(line)
                except ValueError:
                    continue


def count_records(path):
    return sum(1 for _ in iter_records(path))


def flat(value):
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    return value


def discover_columns(path):
    """Every key that appears in any record, in first-seen order, with a simple type per column."""
    columns, kinds = [], {}
    for record in iter_records(path):
        if not isinstance(record, dict):
            continue
        for k, v in record.items():
            if k not in kinds:
                columns.append(k)
                kinds[k] = set()
            if v is None:
                continue
            kinds[k].add("bool" if isinstance(v, bool) else "int" if isinstance(v, int) else "float" if isinstance(v, float) else "str")
    return columns, kinds


def write_json(src, dest):
    with open(dest, "w", encoding="utf-8") as out:
        out.write("[")
        first = True
        for record in iter_records(src):
            out.write(("" if first else ",\n") + json.dumps(record, ensure_ascii=False))
            first = False
        out.write("]\n")


def write_csv(src, dest):
    columns, _ = discover_columns(src)
    with open(dest, "w", encoding="utf-8", newline="") as out:
        writer = csv.writer(out)
        writer.writerow(columns)
        for record in iter_records(src):
            if isinstance(record, dict):
                writer.writerow([flat(record.get(c)) for c in columns])


def write_parquet(src, dest):
    try:
        import pyarrow as pa
        import pyarrow.parquet as pq
    except ImportError:
        raise RuntimeError("Parquet output needs pyarrow on the delivery server")
    columns, kinds = discover_columns(src)

    def arrow_type(kind):
        if kind == {"bool"}:
            return pa.bool_()
        if kind == {"int"}:
            return pa.int64()
        if kind and kind <= {"int", "float"}:
            return pa.float64()
        return pa.string()

    schema = pa.schema([(c, arrow_type(kinds[c])) for c in columns])

    def cell(value, field_type):
        if value is None:
            return None
        if pa.types.is_string(field_type):
            return str(flat(value))
        if pa.types.is_floating(field_type):
            return float(value)
        return value

    writer = pq.ParquetWriter(dest, schema, compression="snappy")
    try:
        batch = []
        for record in iter_records(src):
            if isinstance(record, dict):
                batch.append(record)
            if len(batch) >= 50_000:
                writer.write_table(pa.Table.from_pylist([{f.name: cell(r.get(f.name), f.type) for f in schema} for r in batch], schema=schema))
                batch = []
        if batch:
            writer.write_table(pa.Table.from_pylist([{f.name: cell(r.get(f.name), f.type) for f in schema} for r in batch], schema=schema))
    finally:
        writer.close()


def export_file(src, feed, snap_date, fmt, export_dir):
    """Converted copy under export_dir/<feed>/<date>/, built once per feed, date and format."""
    folder = os.path.join(export_dir, feed, snap_date)
    os.makedirs(folder, mode=0o755, exist_ok=True)
    dest = os.path.join(folder, f"{feed}_{snap_date.replace('-', '')}.{EXTENSIONS[fmt]}")
    if os.path.exists(dest) and os.path.getmtime(dest) >= os.path.getmtime(src):
        return dest
    partial = dest + ".partial"
    if fmt == "jsonl":
        shutil.copyfile(src, partial)
    elif fmt == "json":
        write_json(src, partial)
    elif fmt == "csv":
        write_csv(src, partial)
    elif fmt == "parquet":
        write_parquet(src, partial)
    os.chmod(partial, 0o644)
    os.replace(partial, dest)
    return dest


def prune_exports(export_dir):
    cutoff = (date.today() - timedelta(days=EXPORT_KEEP_DAYS)).isoformat()
    if not os.path.isdir(export_dir):
        return
    for feed in os.listdir(export_dir):
        feed_dir = os.path.join(export_dir, feed)
        if not os.path.isdir(feed_dir):
            continue
        for day in os.listdir(feed_dir):
            if re.fullmatch(r"\d{4}-\d{2}-\d{2}", day) and day < cutoff:
                shutil.rmtree(os.path.join(feed_dir, day), ignore_errors=True)


# ---------- delivery methods ----------

def object_key(prefix, feed, snap_date, filename):
    parts = [p for p in (prefix or "").strip("/").split("/") if p]
    return "/".join(parts + [feed, snap_date, filename])


def bucket_client(cfg, key):
    import boto3
    from botocore.config import Config
    secret = open_secret(key, cfg["secret_access_key"])
    if cfg["method"] == "gcs":
        # GCS speaks the S3 API with HMAC keys; newer botocore checksums must be off for it.
        try:
            conf = Config(signature_version="s3v4", s3={"addressing_style": "path"},
                          request_checksum_calculation="when_required", response_checksum_validation="when_required")
        except TypeError:
            conf = Config(signature_version="s3v4", s3={"addressing_style": "path"})
        return boto3.client("s3", endpoint_url="https://storage.googleapis.com", region_name="auto",
                            aws_access_key_id=cfg["access_key_id"], aws_secret_access_key=secret, config=conf)
    return boto3.client("s3", region_name=cfg["bucket_region"] or "us-east-1",
                        aws_access_key_id=cfg["access_key_id"], aws_secret_access_key=secret)


def deliver_bucket(cfg, key, path, feed, snap_date):
    target = object_key(cfg["bucket_prefix"], feed, snap_date, os.path.basename(path))
    bucket_client(cfg, key).upload_file(path, cfg["bucket"], target)
    scheme = "gs" if cfg["method"] == "gcs" else "s3"
    return f"{scheme}://{cfg['bucket']}/{target}"


def test_bucket(cfg, key):
    client = bucket_client(cfg, key)
    target = "/".join([p for p in (cfg["bucket_prefix"] or "").strip("/").split("/") if p] + [TEST_FILENAME])
    client.put_object(Bucket=cfg["bucket"], Key=target, Body=b"Veyora connection test. Safe to delete.\n")
    try:
        client.delete_object(Bucket=cfg["bucket"], Key=target)
    except Exception:
        pass


def sftp_session(cfg, key):
    import paramiko
    assert_public_host(cfg["sftp_host"])
    transport = paramiko.Transport((cfg["sftp_host"], cfg["sftp_port"] or 22))
    transport.banner_timeout = 20
    transport.connect(username=cfg["sftp_username"], password=open_secret(key, cfg["sftp_password"]))
    return transport, paramiko.SFTPClient.from_transport(transport)


def sftp_makedirs(sftp, rpath):
    current = ""
    for part in [p for p in rpath.split("/") if p]:
        current += "/" + part
        try:
            sftp.stat(current)
        except FileNotFoundError:
            sftp.mkdir(current)


def deliver_sftp(cfg, key, path):
    transport, sftp = sftp_session(cfg, key)
    try:
        rpath = (cfg["sftp_path"] or "/").rstrip("/")
        sftp_makedirs(sftp, rpath)
        remote = f"{rpath}/{os.path.basename(path)}"
        sftp.put(path, remote)
        return f"sftp://{cfg['sftp_host']}{remote}"
    finally:
        sftp.close()
        transport.close()


def test_sftp(cfg, key):
    transport, sftp = sftp_session(cfg, key)
    try:
        rpath = (cfg["sftp_path"] or "/").rstrip("/")
        sftp_makedirs(sftp, rpath)
        remote = f"{rpath}/{TEST_FILENAME}"
        with sftp.open(remote, "w") as f:
            f.write("Veyora connection test. Safe to delete.\n")
        try:
            sftp.remove(remote)
        except OSError:
            pass
    finally:
        sftp.close()
        transport.close()


def snowflake_connect(cfg, key):
    import snowflake.connector
    return snowflake.connector.connect(
        account=cfg["snowflake_account"], user=cfg["snowflake_user"], password=open_secret(key, cfg["snowflake_password"]),
        warehouse=cfg["snowflake_warehouse"], database=cfg["snowflake_database"], schema=cfg["snowflake_schema"],
        role=cfg["snowflake_role"] or None, login_timeout=30, network_timeout=600)


def snowflake_table(cur, table):
    cur.execute(f'CREATE TABLE IF NOT EXISTS "{table}" (record VARIANT, feed_id STRING, snapshot_date DATE, '
                f'loaded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP())')


def deliver_snowflake(cfg, key, source, feed, snap_date):
    """Loads every record as a VARIANT row, tagged with the feed and snapshot date."""
    table = cfg["snowflake_table"]
    conn = snowflake_connect(cfg, key)
    try:
        cur = conn.cursor()
        snowflake_table(cur, table)
        cur.execute(f'PUT \'file://{source}\' @%"{table}" AUTO_COMPRESS=TRUE OVERWRITE=TRUE')
        staged = os.path.basename(source) + ".gz"
        # The connector fills %s with Python %-formatting, so the table stage's own % is written %%.
        cur.execute(f'COPY INTO "{table}" (record, feed_id, snapshot_date) FROM '
                    f'(SELECT $1, %s, %s FROM @%%"{table}"/{staged}) FILE_FORMAT = (TYPE = JSON) PURGE = TRUE',
                    (feed, snap_date))
        return f"snowflake://{cfg['snowflake_account']}/{cfg['snowflake_database']}.{cfg['snowflake_schema']}.{table}"
    finally:
        conn.close()


def test_snowflake(cfg, key):
    conn = snowflake_connect(cfg, key)
    try:
        cur = conn.cursor()
        cur.execute("SELECT CURRENT_VERSION()")
        snowflake_table(cur, cfg["snowflake_table"])
    finally:
        conn.close()


def signed_post(cfg, key, payload):
    import requests
    from urllib.parse import urlparse
    url = cfg["webhook_url"]
    assert_public_host(urlparse(url).hostname)
    body = json.dumps(payload, separators=(",", ":"))
    headers = {"Content-Type": "application/json", "User-Agent": "Veyora-Webhooks/1"}
    secret = open_secret(key, cfg["webhook_secret"])
    if secret:
        ts = str(int(time.time()))
        signature = hmac.new(secret.encode(), f"{ts}.{body}".encode(), hashlib.sha256).hexdigest()
        headers["X-Veyora-Signature"] = f"t={ts},v1={signature}"
    response = requests.post(url, data=body, headers=headers, timeout=20, allow_redirects=False)
    if not 200 <= response.status_code < 300:
        raise RuntimeError(f"Webhook answered HTTP {response.status_code}")


def download_link(site, key, sub_id, log_id):
    expires = int(time.time()) + LINK_TTL_SECONDS
    message = f"{sub_id}.{log_id}.{expires}".encode()
    sig = hmac.new(link_key(key), message, hashlib.sha256).hexdigest()
    return f"{site.rstrip('/')}/v1/feeds/{sub_id}/deliveries/{log_id}/file?expires={expires}&sig={sig}", expires


# ---------- runs ----------

def connect_db(env):
    import psycopg2
    import psycopg2.extras
    if not env.get("DATABASE_URL"):
        raise SystemExit("DATABASE_URL not found")
    conn = psycopg2.connect(env["DATABASE_URL"])
    return conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)


CONFIG_COLUMNS = """dc.method, dc.format, dc.sftp_host, dc.sftp_port, dc.sftp_username, dc.sftp_password, dc.sftp_path,
  dc.bucket, dc.bucket_region, dc.bucket_prefix, dc.access_key_id, dc.secret_access_key,
  dc.snowflake_account, dc.snowflake_user, dc.snowflake_password, dc.snowflake_warehouse, dc.snowflake_database,
  dc.snowflake_schema, dc.snowflake_table, dc.snowflake_role, dc.webhook_url, dc.webhook_secret"""


def run_test(env, key, sub_id):
    conn, cur = connect_db(env)
    try:
        cur.execute(f"SELECT s.id, s.feed_id, {CONFIG_COLUMNS} FROM feed_subscriptions s "
                    f"JOIN delivery_configs dc ON dc.subscription_id = s.id WHERE s.id = %s", (sub_id,))
        cfg = cur.fetchone()
        if not cfg:
            return {"ok": False, "error": "Save the delivery settings before testing them"}
        method = cfg["method"]
        if method == "sftp":
            test_sftp(cfg, key)
        elif method in ("s3", "gcs"):
            test_bucket(cfg, key)
        elif method == "snowflake":
            test_snowflake(cfg, key)
        elif method == "webhook":
            signed_post(cfg, key, {"event": "delivery.test", "feed": cfg["feed_id"], "sent_at": datetime.now(timezone.utc).isoformat()})
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": friendly(e)}
    finally:
        cur.close()
        conn.close()


def friendly(error):
    text = str(error) or error.__class__.__name__
    name = error.__class__.__name__
    if "250001" in text or "Failed to connect to DB" in text:
        return "Could not sign in to that Snowflake account. Check the account identifier (for example myorg-myaccount)"
    if "Incorrect username or password" in text or "390100" in text:
        return "Snowflake refused the user or password"
    if "002003" in text or "does not exist or not authorized" in text:
        return "Snowflake could not find the warehouse, database or schema, or this user's role cannot use it"
    if name == "AuthenticationException":
        return "The SFTP server refused the username or password"
    if name in ("NoValidConnectionsError", "SSHException") or isinstance(error, (socket.timeout, ConnectionError)):
        return f"Could not connect: {text[:200]}"
    if name == "ClientError":
        code = getattr(error, "response", {}).get("Error", {}).get("Code", "")
        return {"AccessDenied": "The bucket refused these keys (access denied)", "NoSuchBucket": "That bucket does not exist",
                "InvalidAccessKeyId": "The access key ID is not recognised", "SignatureDoesNotMatch": "The secret key is wrong"}.get(code, text[:200])
    return text[:300]


def run_delivery(env, key, args):
    export_dir = env.get("DELIVERY_EXPORT_DIR") or "/opt/proxora/data/exports"
    site = env.get("SITE_URL") or "https://veyora.pro"
    source = find_data_file(args.snapshot, args.file)
    if not source:
        raise SystemExit(f"{args.file} not found in {args.snapshot}")
    if args.date:
        snap_date = args.date
    else:
        m = re.search(r"(\d{8})", os.path.basename(args.snapshot.rstrip("/")))
        snap_date = f"{m.group(1)[:4]}-{m.group(1)[4:6]}-{m.group(1)[6:8]}" if m else date.today().isoformat()

    record_count = count_records(source)
    print(f"Feed: {args.feed}  Date: {snap_date}  File: {source}  Records: {record_count}")
    prune_exports(export_dir)

    conn, cur = connect_db(env)
    try:
        cur.execute(f"SELECT s.id AS subscription_id, s.username, s.delivery_method, {CONFIG_COLUMNS} "
                    f"FROM feed_subscriptions s LEFT JOIN delivery_configs dc ON dc.subscription_id = s.id "
                    f"WHERE s.feed_id = %s AND s.status = 'active'", (args.feed,))
        subs = cur.fetchall()
        print(f"  {len(subs)} active subscription(s)")
        for sub in subs:
            sub_id = sub["subscription_id"]
            cur.execute("SELECT 1 FROM delivery_logs WHERE subscription_id = %s AND snapshot_date = %s AND status = 'delivered' LIMIT 1",
                        (sub_id, snap_date))
            if cur.fetchone():
                print(f"  [{sub['username']}] already delivered for {snap_date}")
                continue
            method = sub["method"]
            fmt = sub["format"] or "jsonl"
            cur.execute("INSERT INTO delivery_logs (subscription_id, feed_id, snapshot_date, status, record_count, format, started_at) "
                        "VALUES (%s, %s, %s, 'uploading', %s, %s, now()) RETURNING id", (sub_id, args.feed, snap_date, record_count, fmt))
            log_id = cur.fetchone()["id"]
            conn.commit()
            if not method:
                cur.execute("UPDATE delivery_logs SET status = 'pending', error = %s, completed_at = now() WHERE id = %s",
                            ("Delivery is not set up yet", log_id))
                conn.commit()
                print(f"  [{sub['username']}] no delivery settings, logged as pending")
                continue
            try:
                if method == "snowflake":
                    path, delivered_to = source, deliver_snowflake(sub, key, source, args.feed, snap_date)
                else:
                    path = export_file(source, args.feed, snap_date, fmt, export_dir)
                    if method == "sftp":
                        delivered_to = deliver_sftp(sub, key, path)
                    elif method in ("s3", "gcs"):
                        delivered_to = deliver_bucket(sub, key, path, args.feed, snap_date)
                    elif method == "webhook":
                        link, expires = download_link(site, key, sub_id, log_id)
                        signed_post(sub, key, {
                            "event": "delivery.ready", "feed": args.feed, "snapshot_date": snap_date, "format": fmt,
                            "records": record_count, "size_bytes": os.path.getsize(path), "sha256": sha256_file(path),
                            "download_url": link, "expires_at": datetime.fromtimestamp(expires, timezone.utc).isoformat()})
                        delivered_to = sub["webhook_url"]
                    else:
                        delivered_to = "api"
                size = os.path.getsize(path)
                cur.execute("UPDATE delivery_logs SET status = 'delivered', file_size_bytes = %s, sha256 = %s, export_path = %s, "
                            "delivered_to = %s, completed_at = now() WHERE id = %s",
                            (size, sha256_file(path), path if path != source else None, delivered_to, log_id))
                conn.commit()
                print(f"  [{sub['username']}] delivered by {method} ({fmt}) to {delivered_to}")
            except Exception as e:
                conn.rollback()
                cur.execute("UPDATE delivery_logs SET status = 'failed', error = %s, completed_at = now() WHERE id = %s",
                            (friendly(e), log_id))
                conn.commit()
                print(f"  [{sub['username']}] {method} failed: {e}", file=sys.stderr)
    finally:
        cur.close()
        conn.close()
    print("Done.")


def main():
    parser = argparse.ArgumentParser(description="Deliver a feed snapshot to subscribers, or test one subscription's delivery")
    parser.add_argument("--feed", help="Feed ID (e.g. mobilede)")
    parser.add_argument("--snapshot", help="Path to the snapshot directory")
    parser.add_argument("--file", default="listings.jsonl", help="Data file name inside the snapshot directory")
    parser.add_argument("--date", default=None, help="Snapshot date (YYYY-MM-DD), read from the directory name by default")
    parser.add_argument("--test", action="store_true", help="Test the delivery settings of --subscription")
    parser.add_argument("--subscription", help="Subscription id for --test")
    args = parser.parse_args()

    env = load_env()
    key = parse_key(env.get("DELIVERY_SECRET_KEY"))
    if args.test:
        if not args.subscription or not re.fullmatch(r"[0-9a-f-]{36}", args.subscription):
            print(json.dumps({"ok": False, "error": "A subscription id is required"}))
            return
        print(json.dumps(run_test(env, key, args.subscription)))
        return
    if not args.feed or not args.snapshot:
        parser.error("--feed and --snapshot are required")
    run_delivery(env, key, args)


if __name__ == "__main__":
    main()
