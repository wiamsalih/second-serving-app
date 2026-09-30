-- North-star metric: meals saved per week, plus the rescue rate of what was posted.
with posts as (
    select post_week as week_start, count(*) as posts, sum(portions) as portions_posted, sum(meals_saved) as meals_saved
    from {{ ref('fct_food_posts') }} group by 1
),
wau as (
    select event_week as week_start, count(distinct user_id) as weekly_active_users
    from {{ ref('fct_events') }} group by 1
)
select
    w.week_start,
    coalesce(w.weekly_active_users, 0)                                   as weekly_active_users,
    coalesce(p.posts, 0)                                                 as posts,
    coalesce(p.portions_posted, 0)                                       as portions_posted,
    coalesce(p.meals_saved, 0)                                           as meals_saved,
    round(coalesce(p.meals_saved, 0) / nullif(p.portions_posted, 0), 4)  as rescue_rate
from wau w
left join posts p using (week_start)
order by w.week_start
