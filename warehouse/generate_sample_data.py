"""Generate SAMPLE data shaped exactly like the production Supabase tables.

This exists so you can develop and test the dbt models before real users arrive.
Numbers from sample data are simulated. Never report them as real results.
"""
import csv
import json
import pathlib
import random
import uuid
from datetime import datetime, timedelta, timezone

RAW = pathlib.Path(__file__).parent / "data" / "raw"
EXPERIMENT = "claim_cta_v1"
DAYS = 42
LOCATIONS = ["Bloomberg Center, 2nd floor lounge", "Tata Innovation Center, ground floor",
             "The House, lobby", "Verizon Executive Education Center", "Bloomberg Center, room 131"]
FOODS = [("Veggie wraps and fruit", "vegetarian"), ("Chicken biryani trays", "halal,gluten-free"),
         ("Cheese pizza", "vegetarian"), ("Bagels and cream cheese", "vegetarian"),
         ("Falafel bowls", "vegan,halal"), ("Sandwich platter", ""), ("Sushi rolls", "gluten-free"),
         ("Cookies and brownies", "vegetarian")]


def variant_for(user_id: str) -> str:
    """Same deterministic assignment as site/tracking.js."""
    h = 0
    for ch in user_id + EXPERIMENT:
        h = (h * 31 + ord(ch)) & 0xFFFFFFFF
    return "A" if h % 2 == 0 else "B"


def main(seed: int = 7) -> None:
    random.seed(seed)
    RAW.mkdir(parents=True, exist_ok=True)
    start = (datetime.now(timezone.utc) - timedelta(days=DAYS)).replace(hour=0, minute=0, second=0, microsecond=0)

    users = []
    for i in range(320):
        uid = str(uuid.UUID(int=random.getrandbits(128)))
        users.append({"id": uid, "name": f"Student {i + 1}", "joined_day": int(random.triangular(0, DAYS, 5)),
                      "activity": random.uniform(0.15, 0.6), "named": False})

    posts, claims, events = [], [], []
    ev_id = 0

    def log(ts, user, session, name, post_id=None, **props):
        nonlocal ev_id
        ev_id += 1
        events.append({"id": ev_id, "occurred_at": ts.isoformat(), "user_id": user["id"], "session_id": session,
                       "event_name": name, "post_id": post_id or "", "variant": variant_for(user["id"]),
                       "page": "index.html", "properties": json.dumps(props)})

    for day in range(DAYS):
        date = start + timedelta(days=day)
        weekday = date.weekday() < 5
        day_posts = []
        for _ in range(random.randint(1, 4) if weekday else random.randint(0, 1)):
            organizer = random.choice(users)
            title, dietary = random.choice(FOODS)
            created = date + timedelta(hours=random.randint(11, 19), minutes=random.randint(0, 59))
            p = {"id": str(uuid.UUID(int=random.getrandbits(128))), "created_at": created.isoformat(),
                 "organizer_id": organizer["id"], "organizer_name": organizer["name"], "title": title,
                 "location": random.choice(LOCATIONS), "notes": "", "dietary": dietary,
                 "portions": random.choice([8, 10, 12, 15, 20, 25]),
                 "expires_at": (created + timedelta(minutes=random.choice([30, 60, 90, 120]))).isoformat(),
                 "_created": created, "_expires": None, "_claimed": 0}
            p["_expires"] = datetime.fromisoformat(p["expires_at"])
            posts.append(p)
            day_posts.append(p)

        for u in users:
            if u["joined_day"] > day:
                continue
            weeks_in = (day - u["joined_day"]) / 7
            if random.random() > u["activity"] * (0.85 ** weeks_in) * (1 if weekday else 0.4):
                continue
            session = str(uuid.UUID(int=random.getrandbits(128)))
            ts = date + timedelta(hours=random.randint(11, 20), minutes=random.randint(0, 59))
            log(ts, u, session, "page_view", returning=u["named"])
            live = [p for p in day_posts if p["_created"] <= ts < p["_expires"]]
            for p in live:
                ts += timedelta(seconds=random.randint(3, 40))
                mins_left = int((p["_expires"] - ts).total_seconds() // 60)
                log(ts, u, session, "post_viewed", p["id"], minutes_left=mins_left)
                click_rate = 0.30 if variant_for(u["id"]) == "B" else 0.24
                if random.random() < click_rate:
                    ts += timedelta(seconds=random.randint(2, 20))
                    log(ts, u, session, "claim_clicked", p["id"])
                    if not u["named"]:
                        if random.random() < 0.15:
                            log(ts, u, session, "claim_abandoned", p["id"], reason="no_name")
                            continue
                        u["named"] = True
                        log(ts, u, session, "signup_completed")
                    if p["_claimed"] >= p["portions"]:
                        log(ts, u, session, "claim_failed", p["id"], reason="unavailable")
                        continue
                    p["_claimed"] += 1
                    ts += timedelta(seconds=random.randint(1, 5))
                    claims.append({"id": str(uuid.UUID(int=random.getrandbits(128))), "created_at": ts.isoformat(),
                                   "post_id": p["id"], "user_id": u["id"], "user_name": u["name"], "portions": 1})
                    log(ts, u, session, "claim_completed", p["id"], minutes_left=mins_left)
                    break  # one claim per visit

    def dump(name, rows, cols):
        with open(RAW / f"{name}.csv", "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
            w.writeheader()
            w.writerows(rows)

    dump("food_posts", posts, ["id", "created_at", "organizer_id", "organizer_name", "title", "location",
                               "notes", "dietary", "portions", "expires_at"])
    dump("claims", claims, ["id", "created_at", "post_id", "user_id", "user_name", "portions"])
    dump("events", events, ["id", "occurred_at", "user_id", "session_id", "event_name", "post_id",
                            "variant", "page", "properties"])
    (RAW / "SOURCE").write_text("sample\n")
    print(f"SAMPLE data: {len(posts)} posts, {len(claims)} claims, {len(events)} events")


if __name__ == "__main__":
    main()
