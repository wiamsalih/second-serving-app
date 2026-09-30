-- One row per user (browser identity), with lifecycle milestones and experiment arm.
with ev as (select * from {{ ref('stg_events') }})
select
    user_id,
    min(occurred_at)                                                     as first_seen_at,
    date_trunc('week', min(occurred_at))::date                           as cohort_week,
    arg_min(variant, occurred_at)                                        as variant,
    min(occurred_at) filter (where event_name = 'signup_completed')      as signed_up_at,
    min(occurred_at) filter (where event_name = 'claim_completed')       as first_claim_at,
    min(occurred_at) filter (where event_name = 'post_created')          as first_post_at,
    count(distinct session_id)                                           as sessions,
    count(*) filter (where event_name = 'claim_completed')               as claims_completed
from ev
group by user_id
