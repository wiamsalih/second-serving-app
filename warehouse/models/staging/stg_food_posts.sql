-- One row per food post, typed and cleaned.
select
    id                                                        as post_id,
    (created_at::timestamptz at time zone 'UTC')              as created_at,
    (expires_at::timestamptz at time zone 'UTC')              as expires_at,
    organizer_id,
    organizer_name,
    trim(title)                                               as title,
    trim(location)                                            as location,
    nullif(trim(notes), '')                                   as notes,
    coalesce(dietary, '')                                     as dietary,
    portions::int                                             as portions,
    date_diff('minute', created_at::timestamptz, expires_at::timestamptz) as minutes_available
from read_csv('{{ var("raw_path") }}/food_posts.csv', header = true, all_varchar = true)
