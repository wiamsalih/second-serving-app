-- One row per claimed portion.
select
    id                                           as claim_id,
    (created_at::timestamptz at time zone 'UTC') as claimed_at,
    post_id,
    user_id,
    portions::int                                as portions
from read_csv('{{ var("raw_path") }}/claims.csv', header = true, all_varchar = true)
