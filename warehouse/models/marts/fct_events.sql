-- Event-level fact table: the grain every funnel and engagement metric is built from.
select
    e.*,
    e.occurred_at::date                               as event_date,
    date_trunc('week', e.occurred_at)::date           as event_week,
    try_cast(json_extract_string(e.properties, '$.minutes_left') as int) as minutes_left
from {{ ref('stg_events') }} e
