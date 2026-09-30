-- Data quality: a claim should never land after its post expired (1 minute of clock-skew grace).
select c.*
from {{ ref('fct_claims') }} c
join {{ ref('fct_food_posts') }} p using (post_id)
where c.claimed_at > p.expires_at + interval 1 minute
