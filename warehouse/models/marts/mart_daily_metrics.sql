-- Daily product health: active users, supply (posts), and outcomes (meals saved).
with activity as (
    select event_date as date_day, count(distinct user_id) as active_users
    from {{ ref('fct_events') }} group by 1
),
new_users as (
    select first_seen_at::date as date_day, count(*) as new_users
    from {{ ref('dim_users') }} group by 1
),
supply as (
    select post_date as date_day, count(*) as posts, sum(portions) as portions_posted
    from {{ ref('fct_food_posts') }} group by 1
),
outcomes as (
    select claim_date as date_day, sum(portions) as meals_saved
    from {{ ref('fct_claims') }} group by 1
)
select
    d.date_day,
    d.week_start,
    d.is_weekend,
    coalesce(a.active_users, 0)    as active_users,
    coalesce(n.new_users, 0)       as new_users,
    coalesce(s.posts, 0)           as posts,
    coalesce(s.portions_posted, 0) as portions_posted,
    coalesce(o.meals_saved, 0)     as meals_saved
from {{ ref('dim_date') }} d
left join activity a using (date_day)
left join new_users n using (date_day)
left join supply s using (date_day)
left join outcomes o using (date_day)
