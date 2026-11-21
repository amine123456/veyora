#!/usr/bin/env python3
"""
Generate raw sample data files for the Data Feeds catalog preview.
Dumps UNTOUCHED records straight from each crawler's latest snapshot.
Output: /opt/proxora/public/samples/<feed_id>.json
"""

import json
import os
import random
import sys
from pathlib import Path

OUTPUT_DIR = Path("/opt/proxora/public/samples")
SAMPLE_SIZE = 5

FEEDS = {
    "mobilede": "/home/sftpuser/CAR/DE/Mobilede/mobilede_*/list/listings.jsonl",
    "lacentrale": "/root/lacentrale/all_cars_enriched.jsonl",
    "zoomcar": "/root/zoomcar/data/current/listings.jsonl",
    "nettiauto": "/root/nettiauto/all_cars_enriched.jsonl",
    "donedeal": "/root/donedeal/enriched_cars.jsonl",
    "aramisauto": "/root/aramisauto/data/current/listings.jsonl",
    "similarweb": "/root/similarweb/output.jsonl",
    "hasnalauto": "/root/hasnalauto/final_enriched.jsonl",
    "olx_ro": "/root/olx/all_cars_transformed.jsonl",
}


def find_file(pattern):
    import glob
    matches = sorted(glob.glob(pattern))
    return matches[-1] if matches else None


def reservoir_sample(filepath, n):
    reservoir = []
    with open(filepath, "r") as f:
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


def pick_diverse(records, n):
    # Sort by field richness first so we always showcase the best records
    records.sort(key=lambda r: count_fields(r), reverse=True)
    pool = records[:n * 4]
    seen_makes = set()
    diverse = []
    rest = []
    for r in pool:
        make = r.get("make") or r.get("vehicle", {}).get("make", "")
        if make and make not in seen_makes:
            seen_makes.add(make)
            diverse.append(r)
        else:
            rest.append(r)
    return (diverse + rest)[:n]


def count_fields(record, prefix=""):
    n = 0
    for k, v in record.items():
        n += 1
        if isinstance(v, dict):
            n += count_fields(v)
    return n


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    random.seed(42)

    for feed_id, pattern in FEEDS.items():
        filepath = find_file(pattern)
        if not filepath:
            print(f"SKIP {feed_id}: not found ({pattern})")
            continue

        print(f"Generating {feed_id}...")
        pool = reservoir_sample(filepath, SAMPLE_SIZE * 10)
        if not pool:
            print(f"  SKIP: no records")
            continue

        samples = pick_diverse(pool, SAMPLE_SIZE)

        total = 0
        with open(filepath, "rb") as f:
            for _ in f:
                total += 1
        file_size = os.path.getsize(filepath)

        top_keys = list(samples[0].keys())
        deep_count = count_fields(samples[0])

        result = {
            "feed_id": feed_id,
            "total_records": total,
            "file_size_mb": round(file_size / 1024 / 1024, 1),
            "sample_count": len(samples),
            "fields": top_keys,
            "field_count": len(top_keys),
            "deep_field_count": deep_count,
            "records": samples,
        }

        out_path = OUTPUT_DIR / f"{feed_id}.json"
        with open(out_path, "w") as f:
            json.dump(result, f, indent=2, ensure_ascii=False, default=str)
        print(f"  OK: {len(samples)} raw records, {len(top_keys)} top-level / {deep_count} total fields, {total:,} total records")

    print("Done.")


if __name__ == "__main__":
    main()
