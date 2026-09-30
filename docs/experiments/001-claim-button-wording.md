# Experiment 001: claim button wording

**Status:** Running · **Arms:** A "Claim a portion" · B "Save me one" · **Assignment:** 50/50, permanent per user (see `site/tracking.js`)

## Hypothesis
Wording that feels personal and low-commitment ("Save me one") will increase the share of viewers who click claim.

## Primary metric
View → click rate by arm (`mart_claim_funnel.view_to_click`), tested with a two-proportion z-test in `warehouse/export_dashboard.py`.

## Guardrail
Click → complete rate should not drop. If people click more but abandon more, the wording may be misleading.

## Decision rule
Run until each arm has at least _N_ users who viewed a post, then ship the winner only if p < 0.05. Decide N before you start and don't stop early because a result looks good.

## Result
_Fill in when finished: rates, p-value, decision, and what you'd test next._
