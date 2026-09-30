-- User-level funnel by experiment arm: viewed a post -> clicked claim -> completed a claim.
with steps as (
    select
        u.variant,
        e.user_id,
        max(e.event_name = 'post_viewed')::int     as viewed,
        max(e.event_name = 'claim_clicked')::int   as clicked,
        max(e.event_name = 'claim_completed')::int as completed
    from {{ ref('fct_events') }} e
    join {{ ref('dim_users') }} u using (user_id)
    group by 1, 2
)
select
    variant,
    sum(viewed)                                          as users_viewed,
    sum(clicked * viewed)                                as users_clicked,
    sum(completed * viewed)                              as users_completed,
    round(sum(clicked * viewed) / nullif(sum(viewed), 0), 4)             as view_to_click,
    round(sum(completed * viewed) / nullif(sum(clicked * viewed), 0), 4) as click_to_complete,
    round(sum(completed * viewed) / nullif(sum(viewed), 0), 4)           as view_to_complete
from steps
group by variant
order by variant
