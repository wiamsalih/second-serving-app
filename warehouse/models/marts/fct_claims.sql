-- One row per claimed portion, with timing relative to its post.
select
    c.claim_id,
    c.claimed_at,
    c.claimed_at::date                                     as claim_date,
    c.post_id,
    c.user_id,
    c.portions,
    date_diff('minute', p.created_at, c.claimed_at)        as minutes_after_post,
    c.claimed_at <= p.expires_at                           as claimed_before_expiry
from {{ ref('stg_claims') }} c
join {{ ref('stg_food_posts') }} p using (post_id)
