#!/usr/bin/env python3
"""
Generate raw sample data files for the Data Feeds catalog preview.
Dumps UNTOUCHED records straight from each crawler's latest snapshot.
Output: /opt/proxora/public/samples/<feed_id>.json
"""

import json
import gzip
import os
import random
import sys
from pathlib import Path

OUTPUT_DIR = Path("/opt/proxora/public/samples")
SAMPLE_SIZE = 5


# --- Source definitions ---
# type: "jsonl" | "jsonl_gz" | "sqlite" | "sqlite_payload"
FEEDS = {
    "mobilede": {
        "type": "jsonl",
        "pattern": "/home/sftpuser/CAR/DE/Mobilede/mobilede_*/list/listings.jsonl",
    },
    "lacentrale": {
        "type": "jsonl",
        "path": "/root/lacentrale/all_cars_enriched.jsonl",
    },
    "zoomcar": {
        "type": "jsonl",
        "path": "/root/zoomcar/data/current/listings.jsonl",
    },
    "nettiauto": {
        "type": "jsonl",
        "path": "/root/nettiauto/all_cars_enriched.jsonl",
    },
    "donedeal": {
        "type": "jsonl",
        "path": "/root/donedeal/enriched_cars.jsonl",
    },
    "aramisauto": {
        "type": "jsonl",
        "path": "/root/aramisauto/data/current/listings.jsonl",
    },
    "similarweb": {
        "type": "jsonl",
        "path": "/root/similarweb/output.jsonl",
    },
    "hasnalauto": {
        "type": "jsonl",
        "path": "/root/hasnalauto/final_enriched.jsonl",
    },
    "olx_ro": {
        "type": "jsonl",
        "path": "/root/olx/all_cars_transformed.jsonl",
    },
    "leboncoin": {
        "type": "jsonl_gz",
        "path": "/root/leboncoin/data/all_cars.jsonl.gz",
    },
    "milanuncios": {
        "type": "jsonl",
        "path": "/root/milanuncios/all_cars_enriched.jsonl",
    },
    "coches": {
        "type": "jsonl",
        "path": "/root/coches/all_cars_enriched.jsonl",
    },
    "gocar": {
        "type": "jsonl",
        "path": "/root/gocar/cars_gocar.jsonl",
    },
    "tayara": {
        "type": "jsonl",
        "path": "/root/tayaratn/all_cars.jsonl",
    },
    "capterra": {
        "type": "jsonl",
        "path": "/root/capterra/data/reviews.jsonl",
    },
    "sahibinden": {
        "type": "jsonl",
        "path": "/root/sahibinden/data/listings.jsonl",
    },
    "quintoandar": {
        "type": "sqlite",
        "db": "/root/quintoandar/quintoandar.db",
        "table": "listings",
        "exclude_cols": ["raw_json", "enriched", "enriched_at"],
    },
    "cargr": {
        "type": "sqlite_payload",
        "db": "/root/carGr/data/crawl.sqlite3",
        "table": "listings",
        "payload_col": "payload",
    },
}


def find_file(pattern):
    import glob
    matches = sorted(glob.glob(pattern))
    return matches[-1] if matches else None


def reservoir_sample_jsonl(filepath, n, is_gzipped=False):
    reservoir = []
    opener = gzip.open if is_gzipped else open
    with opener(filepath, "rt", encoding="utf-8") as f:
        for i, line in enumerate(f):
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue
            if i < n:
                reservoir.append(record)
            else:
                j = random.randint(0, i)
                if j < n:
                    reservoir[j] = record
    return reservoir


def count_lines(filepath, is_gzipped=False):
    total = 0
    opener = gzip.open if is_gzipped else open
    with opener(filepath, "rb") as f:
        for _ in f:
            total += 1
    return total


def sample_sqlite(db_path, table, n, exclude_cols=None):
    import sqlite3
    conn = sqlite3.connect(db_path)
    cols = [c[1] for c in conn.execute(f"PRAGMA table_info([{table}])").fetchall()]
    if exclude_cols:
        cols = [c for c in cols if c not in exclude_cols]
    col_list = ", ".join(f"[{c}]" for c in cols)
    total = conn.execute(f"SELECT COUNT(*) FROM [{table}]").fetchone()[0]
    rows = conn.execute(
        f"SELECT {col_list} FROM [{table}] ORDER BY RANDOM() LIMIT ?", (n,)
    ).fetchall()
    records = []
    for row in rows:
        rec = {}
        for col, val in zip(cols, row):
            if isinstance(val, str) and val.startswith("{"):
                try:
                    val = json.loads(val)
                except json.JSONDecodeError:
                    pass
            rec[col] = val
        records.append(rec)
    conn.close()
    return records, total


def sample_sqlite_payload(db_path, table, payload_col, n):
    import sqlite3
    conn = sqlite3.connect(db_path)
    total = conn.execute(f"SELECT COUNT(*) FROM [{table}]").fetchone()[0]
    rows = conn.execute(
        f"SELECT [{payload_col}] FROM [{table}] ORDER BY RANDOM() LIMIT ?", (n,)
    ).fetchall()
    records = []
    for row in rows:
        try:
            records.append(json.loads(row[0]))
        except (json.JSONDecodeError, TypeError):
            continue
    conn.close()
    return records, total


def count_fields(record, prefix=""):
    n = 0
    if not isinstance(record, dict):
        return 0
    for k, v in record.items():
        n += 1
        if isinstance(v, dict):
            n += count_fields(v)
    return n


def pick_diverse(records, n):
    records.sort(key=lambda r: count_fields(r), reverse=True)
    pool = records[: n * 4]
    seen_makes = set()
    diverse = []
    rest = []
    for r in pool:
        make = r.get("make") or (r.get("vehicle", {}) or {}).get("make", "")
        if make and make not in seen_makes:
            seen_makes.add(make)
            diverse.append(r)
        else:
            rest.append(r)
    return (diverse + rest)[:n]


def estimate_file_size(filepath, total_records, is_gzipped=False):
    raw_size = os.path.getsize(filepath)
    if is_gzipped:
        raw_size = raw_size * 6
    return round(raw_size / 1024 / 1024, 1)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    random.seed(42)

    for feed_id, cfg in FEEDS.items():
        src_type = cfg["type"]
        print(f"Generating {feed_id} ({src_type})...")

        try:
            if src_type in ("jsonl", "jsonl_gz"):
                is_gz = src_type == "jsonl_gz"
                filepath = cfg.get("path")
                if not filepath and "pattern" in cfg:
                    filepath = find_file(cfg["pattern"])
                if not filepath or not os.path.exists(filepath):
                    print(f"  SKIP: file not found ({cfg.get('path') or cfg.get('pattern')})")
                    continue

                pool = reservoir_sample_jsonl(filepath, SAMPLE_SIZE * 10, is_gzipped=is_gz)
                if not pool:
                    print(f"  SKIP: no records")
                    continue

                samples = pick_diverse(pool, SAMPLE_SIZE)
                total = count_lines(filepath, is_gzipped=is_gz)
                file_size_mb = estimate_file_size(filepath, total, is_gzipped=is_gz)

            elif src_type == "sqlite":
                samples, total = sample_sqlite(
                    cfg["db"], cfg["table"], SAMPLE_SIZE,
                    exclude_cols=cfg.get("exclude_cols"),
                )
                if not samples:
                    print(f"  SKIP: no records in {cfg['table']}")
                    continue
                file_size_mb = round(os.path.getsize(cfg["db"]) / 1024 / 1024, 1)

            elif src_type == "sqlite_payload":
                samples, total = sample_sqlite_payload(
                    cfg["db"], cfg["table"], cfg["payload_col"], SAMPLE_SIZE,
                )
                if not samples:
                    print(f"  SKIP: no records in {cfg['table']}")
                    continue
                file_size_mb = round(os.path.getsize(cfg["db"]) / 1024 / 1024, 1)
            else:
                print(f"  SKIP: unknown type {src_type}")
                continue

            top_keys = list(samples[0].keys())
            deep_count = count_fields(samples[0])

            result = {
                "feed_id": feed_id,
                "total_records": total,
                "file_size_mb": file_size_mb,
                "sample_count": len(samples),
                "fields": top_keys,
                "field_count": len(top_keys),
                "deep_field_count": deep_count,
                "records": samples,
            }

            out_path = OUTPUT_DIR / f"{feed_id}.json"
            with open(out_path, "w") as f:
                json.dump(result, f, indent=2, ensure_ascii=False, default=str)
            print(f"  OK: {len(samples)} records, {len(top_keys)} top-level / {deep_count} total fields, {total:,} total")

        except Exception as e:
            print(f"  ERROR: {e}")

    print("\nDone.")


if __name__ == "__main__":
    main()
