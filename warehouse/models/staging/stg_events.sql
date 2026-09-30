-- One row per tracked product event.
select
    id::bigint                                    as event_id,
    (occurred_at::timestamptz at time zone 'UTC') as occurred_at,
    user_id,
    session_id,
    event_name,
    nullif(post_id, '')                           as post_id,
    variant,
    page,
    coalesce(nullif(properties, ''), '{}')::json  as properties
from read_csv('{{ var("raw_path") }}/events.csv', header = true, all_varchar = true)
