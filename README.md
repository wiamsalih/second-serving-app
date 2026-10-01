# Second Serving

Leftover event food at Cornell Tech, claimed before it's thrown out.

Organizers post leftover food with a location, portion count, and time window. Students see what's available, sorted by time left, and claim a portion. Every action is tracked, modeled in a data warehouse, and reported on a public metrics dashboard.

## How it fits together

```
 Browser (Vercel)                  Supabase (Postgres)             GitHub Actions (daily)
 ┌──────────────────────┐   write  ┌──────────────────────┐  read  ┌─────────────────────────────┐
 │ site/index.html      │ ───────► │ food_posts           │ ─────► │ extract.py  → raw CSVs      │
 │  post, claim, filter │          │ claims               │        │ dbt build   → star schema    │
 │ site/tracking.js     │ ───────► │ events (telemetry)   │        │              + data tests   │
 └──────────────────────┘          └──────────────────────┘        │ export_dashboard.py → JSON  │
 ┌──────────────────────┐                                           └──────────────┬──────────────┘
 │ site/dashboard.html  │ ◄──────────────── site/data/metrics.json ◄───────────────┘
 └──────────────────────┘
```

| Folder | What's in it |
|---|---|
| `site/` | The website: board, post form, claim flow, event tracking, A/B test, metrics dashboard |
| `supabase/` | Database schema with row-level security |
| `warehouse/` | dbt project on DuckDB: staging models, star schema, metric marts, data quality tests |
| `docs/` | PM layer: PRD, OKRs, metric definitions, research guides, experiment write-ups, decision log |
| `.github/workflows/` | Pipeline that rebuilds the warehouse daily and deploys the site |

## Data model

- **Staging:** `stg_food_posts`, `stg_claims`, `stg_events` (typed and cleaned raw tables)
- **Dimensions:** `dim_users` (lifecycle milestones, experiment arm), `dim_date` (calendar spine)
- **Facts:** `fct_events`, `fct_claims`, `fct_food_posts` (meals saved, rescue rate, time to first claim)
- **Marts:** `mart_daily_metrics`, `mart_weekly_north_star`, `mart_claim_funnel`, `mart_retention`
- **Tests:** uniqueness, nulls, accepted values, referential integrity, plus custom checks that claims never happen after a post expires and posts are never over-claimed

## Setup

### 1. Try it locally (no accounts needed)

```bash
cd site
python3 -m http.server 8000
# open http://localhost:8000
```

With no Supabase keys, the site runs in demo mode and saves data in your browser.

To build the warehouse on sample data:

```bash
cd warehouse
pip install -r requirements.txt
python extract.py          # no secrets set, so it generates SAMPLE data
dbt build --profiles-dir . # builds models and runs data tests
python export_dashboard.py # writes site/data/metrics.json
```

Then open `http://localhost:8000/dashboard.html`. It shows a banner while using sample data. **Sample numbers are simulated; never report them as real results.**

### 2. Create the database

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste `supabase/schema.sql`, and run it.
3. In **Project Settings → API**, copy the **Project URL**, the **anon public** key, and the **service_role** key.
4. Paste the URL and anon key into `site/config.js`. The anon key is designed to be public; row-level security limits it to reading posts and inserting new rows.

### 3. Deploy on GitHub

1. Create a new GitHub repository and push this folder to its `main` branch.
2. In the repo, go to **Settings → Secrets and variables → Actions** and add:
   - `SUPABASE_URL`: your project URL
   - `SUPABASE_SERVICE_KEY`: the service_role key. Keep this secret and never put it in `site/`.
   - `VERCEL_TOKEN`: a token from [vercel.com/account/tokens](https://vercel.com/account/tokens).
3. Push a commit, or run the workflow from the **Actions** tab. The first run creates the `second-serving-app` project on Vercel, and your site will be at `https://second-serving-app.vercel.app` (or a similar URL shown in the Vercel dashboard).

The pipeline then runs every morning at 6:00 UTC, so the dashboard updates daily.

## Known limitations (good next steps)

- **No sign-in.** Identity is a random ID in the browser plus a name. Adding Cornell email sign-in through Supabase Auth would stop spam posts.
- **Race on the last portion.** Two people can claim the final portion at the same moment. The `assert_claims_within_portions` test warns when this happens; the fix is a Postgres function that checks and inserts in one transaction.
- **No notifications.** Students have to check the site. Email or Slack alerts are the next feature to test.
