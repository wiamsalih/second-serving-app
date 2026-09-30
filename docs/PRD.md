# Second Serving: Product Requirements

**Owner:** Wiam Salih · **Status:** Draft · **Last updated:** _date_

## Problem
Campus events at Cornell Tech often end with extra food that gets thrown away, while students nearby would happily eat it. Organizers have no quick way to tell people food is available, and students have no reliable place to check.

_Replace this paragraph with what you learn in interviews. Quote real people (with permission) and add numbers where you can, e.g. "5 of 7 organizers said they throw out food after most events."_

## Target users
- **Organizers**: student clubs, program staff, and anyone hosting an event with food. Need: get rid of leftovers in under a minute, without extra work.
- **Students**: anyone on campus. Need: know what food is available, where, and for how long, before walking over.

## Goals and non-goals
**Goals:** reduce event food waste at Cornell Tech; make posting take under 60 seconds; make it obvious whether food is still there.
**Non-goals (for now):** payments, delivery, other campuses, food safety certification.

## Success metrics
See [OKRs.md](OKRs.md) and [metrics.md](metrics.md). North star: **meals saved per week.**

## Requirements
| Priority | Requirement | Why |
|---|---|---|
| P0 | Organizer can post food with location, portions, and time window | Core supply |
| P0 | Students see active posts sorted by time left | Core demand |
| P0 | Students can claim a portion; counts update for everyone | Prevents wasted trips |
| P0 | Every key action is tracked as an event | Measure the north star and funnel |
| P1 | Dietary filters | Interview finding _(confirm)_ |
| P1 | A/B test on claim button wording | Learn what drives claims |
| P2 | Notifications (email or Slack) when food is posted | Reach students not on the site |
| P2 | Organizer sign-in | Trust and abuse prevention |

## Open questions
- How do students hear about leftover food today (group chats, Slack, word of mouth)?
- Do organizers need approval from facilities or catering to share leftovers?
- What's the right default time window?

## Competitive landscape
| Option | What it does well | Gap for this campus |
|---|---|---|
| Too Good To Go | Polished app, restaurant supply | Paid, businesses only, not campus events |
| Group chats / Slack | Already where students are | Messages get buried; no counts or timing |
| _Cornell's existing tools_ | _Research this_ | _Research this_ |
