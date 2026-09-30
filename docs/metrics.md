# Metric definitions

Every metric on the dashboard is defined once, here, and computed in the warehouse.

| Metric | Definition | Model |
|---|---|---|
| Meals saved | Claimed portions, capped at portions posted per post | `fct_food_posts.meals_saved` |
| Rescue rate | Meals saved ÷ portions posted | `mart_weekly_north_star` |
| Active users (DAU/WAU) | Distinct users with any event in the day/week | `mart_daily_metrics`, `mart_weekly_north_star` |
| New users | Users whose first event falls on that day | `dim_users.first_seen_at` |
| View → click | Users who clicked claim ÷ users who viewed a post | `mart_claim_funnel` |
| Click → complete | Users who completed a claim ÷ users who clicked claim | `mart_claim_funnel` |
| Retention (week k) | Share of a weekly cohort active k weeks after first visit | `mart_retention` |
| Time to first claim | Minutes from post creation to its first claim | `fct_food_posts.minutes_to_first_claim` |

## Event tracking plan

| Event | Fired when | Key properties |
|---|---|---|
| `page_view` | Board loads | `returning` |
| `post_viewed` | ≥50% of a ticket is on screen (once per post per session) | `post_id`, `minutes_left` |
| `claim_clicked` | Claim button pressed | `post_id`, `cta_label` |
| `claim_completed` | Claim saved | `post_id`, `minutes_left` |
| `claim_failed` / `claim_abandoned` | Food gone, error, or no name given | `reason` |
| `signup_completed` | User enters a name for the first time | |
| `post_form_opened` / `post_created` / `post_failed` | Organizer posting flow | `portions`, `minutes_available` |
| `filter_changed` | Dietary filter toggled | `filter`, `enabled` |

Every event also records `user_id`, `session_id`, `variant`, and `page`.
