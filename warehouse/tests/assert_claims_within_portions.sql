-- Data quality: posts should not be over-claimed. Two people claiming the last portion at the
-- same moment can cause this; the warning tells you when to add a server-side check.
{{ config(severity = 'warn') }}
select post_id, portions, claimed_portions
from {{ ref('fct_food_posts') }}
where claimed_portions > portions
