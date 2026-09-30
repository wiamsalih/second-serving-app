"""Export warehouse marts to site/data/metrics.json for the public dashboard."""
import json
import math
import pathlib
from datetime import datetime, timezone

import duckdb

HERE = pathlib.Path(__file__).parent
OUT = HERE.parent / "site" / "data" / "metrics.json"


def rows(con, sql):
    cur = con.execute(sql)
    cols = [d[0] for d in cur.description]
    return [{c: (v.isoformat() if hasattr(v, "isoformat") else v) for c, v in zip(cols, r)} for r in cur.fetchall()]


def two_proportion_test(x1, n1, x2, n2):
    """Two-sided z-test for a difference in conversion rates between arms A and B."""
    if min(n1, n2) == 0:
        return None
    p1, p2 = x1 / n1, x2 / n2
    pooled = (x1 + x2) / (n1 + n2)
    se = math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2))
    if se == 0:
        return None
    z = (p2 - p1) / se
    p_value = math.erfc(abs(z) / math.sqrt(2))
    return {"rate_a": round(p1, 4), "rate_b": round(p2, 4), "lift": round((p2 - p1) / p1, 4) if p1 else None,
            "z": round(z, 3), "p_value": round(p_value, 4), "significant": p_value < 0.05,
            "n_a": n1, "n_b": n2}


def main():
    con = duckdb.connect(str(HERE / "warehouse.duckdb"), read_only=True)
    source = (HERE / "data" / "raw" / "SOURCE").read_text().strip() if (HERE / "data" / "raw" / "SOURCE").exists() else "unknown"

    funnel = rows(con, "select * from mart_claim_funnel")
    by_arm = {r["variant"]: r for r in funnel}
    ab = None
    if "A" in by_arm and "B" in by_arm:
        a, b = by_arm["A"], by_arm["B"]
        ab = two_proportion_test(a["users_clicked"], a["users_viewed"], b["users_clicked"], b["users_viewed"])

    totals = con.execute("""
        select sum(meals_saved), sum(portions_posted), count(*) filter (where posts > 0)
        from mart_daily_metrics
    """).fetchone()
    users = con.execute("select count(*), count(first_claim_at) from dim_users").fetchone()

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": source,
        "totals": {"meals_saved": int(totals[0] or 0), "portions_posted": int(totals[1] or 0),
                   "days_with_food": int(totals[2] or 0), "users": users[0], "users_who_claimed": users[1]},
        "weekly": rows(con, "select * from mart_weekly_north_star"),
        "daily": rows(con, "select date_day, active_users, new_users, posts, meals_saved from mart_daily_metrics order by date_day"),
        "funnel": funnel,
        "ab_test": ab,
        "retention": rows(con, "select * from mart_retention where weeks_since_first_visit <= 5"),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=1, default=float))
    print(f"Wrote {OUT} ({source} data)")


if __name__ == "__main__":
    main()
