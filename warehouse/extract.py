"""Extract raw tables from Supabase into warehouse/data/raw/*.csv.

Runs in GitHub Actions with two repository secrets:
  SUPABASE_URL          e.g. https://abcd1234.supabase.co
  SUPABASE_SERVICE_KEY  the service_role key (never put this in the website)

If the secrets are missing, it generates clearly-labeled sample data instead,
so the pipeline and dashboard still build while you develop.
"""
import csv
import json
import os
import pathlib
import sys

import requests

RAW = pathlib.Path(__file__).parent / "data" / "raw"
TABLES = ["food_posts", "claims", "events"]
PAGE = 1000


def fetch_table(base_url: str, key: str, table: str) -> list[dict]:
    rows, start = [], 0
    headers = {"apikey": key, "Authorization": f"Bearer {key}", "Range-Unit": "items"}
    while True:
        headers["Range"] = f"{start}-{start + PAGE - 1}"
        r = requests.get(f"{base_url}/rest/v1/{table}?select=*", headers=headers, timeout=60)
        r.raise_for_status()
        batch = r.json()
        rows.extend(batch)
        if len(batch) < PAGE:
            return rows
        start += PAGE


def write_csv(table: str, rows: list[dict], fieldnames: list[str]) -> None:
    with open(RAW / f"{table}.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for row in rows:
            w.writerow({k: json.dumps(v) if isinstance(v, (dict, list)) else v for k, v in row.items()})


COLUMNS = {
    "food_posts": ["id", "created_at", "organizer_id", "organizer_name", "title", "location",
                   "notes", "dietary", "portions", "expires_at"],
    "claims": ["id", "created_at", "post_id", "user_id", "user_name", "portions"],
    "events": ["id", "occurred_at", "user_id", "session_id", "event_name", "post_id",
               "variant", "page", "properties"],
}


def main() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    # Strip stray whitespace/newlines that often sneak in when pasting secrets.
    url = (os.environ.get("SUPABASE_URL") or "").strip().rstrip("/").removesuffix("/rest/v1")
    key = (os.environ.get("SUPABASE_SERVICE_KEY") or "").strip()
    if not (url and key):
        print("No Supabase secrets found; generating SAMPLE data.")
        import generate_sample_data
        generate_sample_data.main()
        return
    for table in TABLES:
        rows = fetch_table(url.rstrip("/"), key, table)
        write_csv(table, rows, COLUMNS[table])
        print(f"{table}: {len(rows)} rows")
    (RAW / "SOURCE").write_text("production\n")


if __name__ == "__main__":
    sys.path.insert(0, str(pathlib.Path(__file__).parent))
    main()
