-- One row per food post with its outcome: how much was claimed and how fast.
with claims as (
    select post_id, sum(portions) as claimed_portions, min(minutes_after_post) as minutes_to_first_claim
    from {{ ref('fct_claims') }}
    group by post_id
),
views as (
    select post_id, count(distinct user_id) as unique_viewers
    from {{ ref('fct_events') }}
    where event_name = 'post_viewed'
    group by post_id
)
select
    p.post_id,
    p.created_at,
    p.created_at::date                                              as post_date,
    date_trunc('week', p.created_at)::date                          as post_week,
    p.expires_at,
    p.organizer_id,
    p.title,
    p.location,
    p.dietary,
    p.portions,
    p.minutes_available,
    coalesce(v.unique_viewers, 0)                                   as unique_viewers,
    coalesce(c.claimed_portions, 0)                                 as claimed_portions,
    least(coalesce(c.claimed_portions, 0), p.portions)              as meals_saved,
    round(least(coalesce(c.claimed_portions, 0), p.portions) / p.portions, 4) as rescue_rate,
    c.minutes_to_first_claim,
    coalesce(c.claimed_portions, 0) >= p.portions                   as fully_claimed
from {{ ref('stg_food_posts') }} p
left join claims c using (post_id)
left join views v using (post_id)
