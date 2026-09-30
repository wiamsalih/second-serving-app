-- Weekly cohort retention: of users first seen in week N, what share came back k weeks later.
with activity as (
    select distinct user_id, event_week from {{ ref('fct_events') }}
),
cohorts as (
    select cohort_week, count(*) as cohort_size from {{ ref('dim_users') }} group by 1
)
select
    u.cohort_week,
    c.cohort_size,
    date_diff('week', u.cohort_week, a.event_week)          as weeks_since_first_visit,
    count(distinct a.user_id)                               as active_users,
    round(count(distinct a.user_id) / c.cohort_size, 4)     as retention_rate
from activity a
join {{ ref('dim_users') }} u using (user_id)
join cohorts c using (cohort_week)
group by 1, 2, 3
order by 1, 3
