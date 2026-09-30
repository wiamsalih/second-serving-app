-- Calendar spine covering every day with activity, so days with zero activity still appear.
with bounds as (
    select min(occurred_at)::date as start_date, greatest(max(occurred_at)::date, current_date) as end_date
    from {{ ref('stg_events') }}
)
select
    d::date                              as date_day,
    date_trunc('week', d)::date          as week_start,
    dayname(d)                           as day_name,
    isodow(d) in (6, 7)                  as is_weekend
from bounds, generate_series(start_date, end_date, interval 1 day) as g(d)
