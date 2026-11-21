#!/usr/bin/env python3
"""
Post-crawl delivery hook: pushes snapshot data to all active SFTP subscribers.

Usage:
  python3 /opt/proxora/scripts/deliver-feeds.py \
    --feed mobilede \
    --snapshot /home/sftpuser/CAR/DE/Mobilede/mobilede_20261118 \
    --file listings.jsonl

Reads DATABASE_URL from /opt/proxora/.env. Idempotent: skips subscriptions that
already have a 'delivered' log for the given snapshot date.
"""

import argparse
import hashlib
import os
import re
import sys
import warnings
from datetime import date, datetime, timezone

warnings.filterwarnings("ignore")
import paramiko
import psycopg2
import psycopg2.extras

ENV_FILE = "/opt/proxora/.env"


def load_env():
    if not os.path.exists(ENV_FILE):
        return {}
    env = {}
    with open(ENV_FILE) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, _, v = line.partition("=")
                env[k.strip()] = v.strip()
    return env


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def find_data_file(snapshot_dir, filename):
    """Look for the data file in the snapshot directory, trying common layouts."""
    candidates = [
        os.path.join(snapshot_dir, filename),
        os.path.join(snapshot_dir, "list", filename),
    ]
    for c in candidates:
        if os.path.isfile(c):
            return c
    return None


def count_lines(path):
    n = 0
    with open(path, "rb") as f:
        for _ in f:
            n += 1
    return n


def deliver_sftp(sub, local_file, remote_filename):
    host = sub["sftp_host"]
    port = sub["sftp_port"] or 22
    user = sub["sftp_username"]
    pwd = sub["sftp_password"] or ""
    rpath = (sub["sftp_path"] or "/").rstrip("/")

    transport = paramiko.Transport((host, port))
    transport.connect(username=user, password=pwd)
    sftp = paramiko.SFTPClient.from_transport(transport)
    try:
        parts = [p for p in rpath.split("/") if p]
        current = ""
        for part in parts:
            current += "/" + part
            try:
                sftp.stat(current)
            except FileNotFoundError:
                sftp.mkdir(current)

        remote_path = f"{rpath}/{remote_filename}"
        sftp.put(local_file, remote_path)
        return remote_path
    finally:
        sftp.close()
        transport.close()


def main():
    parser = argparse.ArgumentParser(description="Deliver feed snapshot to subscribers")
    parser.add_argument("--feed", required=True, help="Feed ID (e.g. mobilede)")
    parser.add_argument("--snapshot", required=True, help="Path to snapshot directory")
    parser.add_argument("--file", default="listings.jsonl", help="Data file name inside snapshot dir")
    parser.add_argument("--date", default=None, help="Snapshot date (YYYY-MM-DD), auto-detected from dir name")
    args = parser.parse_args()

    env = load_env()
    db_url = env.get("DATABASE_URL", os.environ.get("DATABASE_URL", ""))
    if not db_url:
        print("ERROR: DATABASE_URL not found", file=sys.stderr)
        sys.exit(1)

    local_file = find_data_file(args.snapshot, args.file)
    if not local_file:
        print(f"ERROR: {args.file} not found in {args.snapshot}", file=sys.stderr)
        sys.exit(1)

    if args.date:
        snap_date = args.date
    else:
        m = re.search(r"(\d{8})", os.path.basename(args.snapshot))
        if m:
            d = m.group(1)
            snap_date = f"{d[:4]}-{d[4:6]}-{d[6:8]}"
        else:
            snap_date = date.today().isoformat()

    file_size = os.path.getsize(local_file)
    file_hash = sha256_file(local_file)
    record_count = count_lines(local_file)

    print(f"Feed: {args.feed}  Date: {snap_date}  File: {local_file}")
    print(f"  Records: {record_count}  Size: {file_size / 1024 / 1024:.1f} MB  SHA256: {file_hash[:16]}...")

    conn = psycopg2.connect(db_url)
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        cur.execute("""
            SELECT s.id AS subscription_id, s.username, s.frequency, s.delivery_method,
                   dc.method, dc.sftp_host, dc.sftp_port, dc.sftp_username, dc.sftp_password, dc.sftp_path,
                   dc.webhook_url, dc.webhook_secret, dc.notes
            FROM feed_subscriptions s
            LEFT JOIN delivery_configs dc ON dc.subscription_id = s.id
            WHERE s.feed_id = %s AND s.status = 'active'
        """, (args.feed,))
        subs = cur.fetchall()

        if not subs:
            print("  No active subscriptions for this feed.")
            return

        print(f"  {len(subs)} active subscription(s)")

        for sub in subs:
            sub_id = sub["subscription_id"]

            cur.execute("""
                SELECT 1 FROM delivery_logs
                WHERE subscription_id = %s AND snapshot_date = %s AND status = 'delivered'
                LIMIT 1
            """, (sub_id, snap_date))
            if cur.fetchone():
                print(f"  [{sub['username']}] Already delivered for {snap_date}, skipping")
                continue

            cur.execute("""
                INSERT INTO delivery_logs (subscription_id, feed_id, snapshot_date, status, record_count, file_size_bytes, sha256, started_at)
                VALUES (%s, %s, %s, 'uploading', %s, %s, %s, now())
                RETURNING id
            """, (sub_id, args.feed, snap_date, record_count, file_size, file_hash))
            log_id = cur.fetchone()["id"]
            conn.commit()

            method = sub["method"] or sub["delivery_method"]
            if method == "sftp" and sub["sftp_host"]:
                try:
                    remote_filename = f"{args.feed}_{snap_date.replace('-', '')}.jsonl"
                    remote_path = deliver_sftp(sub, local_file, remote_filename)
                    cur.execute("""
                        UPDATE delivery_logs SET status = 'delivered', completed_at = now()
                        WHERE id = %s
                    """, (log_id,))
                    conn.commit()
                    print(f"  [{sub['username']}] Delivered to {sub['sftp_host']}:{remote_path}")
                except Exception as e:
                    cur.execute("""
                        UPDATE delivery_logs SET status = 'failed', error = %s, completed_at = now()
                        WHERE id = %s
                    """, (str(e)[:500], log_id))
                    conn.commit()
                    print(f"  [{sub['username']}] SFTP failed: {e}", file=sys.stderr)
            elif method == "webhook" and sub.get("webhook_url"):
                cur.execute("""
                    UPDATE delivery_logs SET status = 'pending', completed_at = now()
                    WHERE id = %s
                """, (log_id,))
                conn.commit()
                print(f"  [{sub['username']}] Webhook delivery not yet automated, logged as pending")
            else:
                cur.execute("""
                    UPDATE delivery_logs SET status = 'pending', completed_at = now()
                    WHERE id = %s
                """, (log_id,))
                conn.commit()
                print(f"  [{sub['username']}] Manual delivery, logged as pending")

    finally:
        cur.close()
        conn.close()

    print("Done.")


if __name__ == "__main__":
    main()
