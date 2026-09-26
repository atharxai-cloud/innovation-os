# Epic 7 — Gap Finder

## Objective
Generate grounded Gap Hypotheses from saved Evidence + Prior Art.

## Minimum context gate
Gap Finder refuses to run unless the project has:
- at least 1 saved evidence source
- at least 1 saved prior-art item

Failure returns INSUFFICIENT_CONTEXT. No speculative fallback gap is generated.

## Output
Each candidate contains:
- title
- description
- gap type
- known limitation
- opportunity rationale
- assumptions
- validation questions
- confidence
- evidence source IDs
- prior-art item IDs

Every saved Gap starts:
UNVALIDATED

## Gap types
- CONTEXT
- COST
- PERFORMANCE
- INTEGRATION
- ACCESSIBILITY
- ENVIRONMENTAL
- OTHER

## Grounding safety
The model receives only IDs from the active project.
Server code filters generated source/prior-art IDs against the authorized project before save.
Database RPC checks the relationships again under RLS.

## Data model
- gaps
- gap_evidence
- gap_prior_art

## Staging validation
Created one Gap:
- status: UNVALIDATED
- evidence links: 1
- prior-art links: 1
- GAP_CREATED events: 1

Cross-tenant user B:
- visible gaps: 0
- visible gap evidence links: 0
- visible gap prior-art links: 0

Synthetic data removed after validation.

## Product rule
A Gap is a validation hypothesis. Innovation OS does not equate a generated Gap with legal novelty or patentability.
