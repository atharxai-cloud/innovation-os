# Epic 8/9 — Experiment Designer + Scientific Critic

## Objective
Convert a saved Gap Hypothesis into an experiment design, then gate readiness through an independent scientific critique.

## Status flow
DRAFT
→ Scientific Critic
→ NEEDS_REVISION (if blocking issues exist)
or
→ AI_REVIEWED (if no blockers)
→ READY (explicit user action through database gate)

READY cannot be written directly by the browser.

## Experiment Designer
Default model:
gpt-5.6-terra

Produces:
- research question
- hypothesis
- independent variable
- dependent variable
- control
- sample
- measurement method
- protocol
- success criteria
- expected failure modes
- safety/ethics notes

## Scientific Critic
Default model:
gpt-5.6-sol

Independent prompt and agent path.

Checks:
- hypothesis alignment
- control validity
- measurement validity
- confounders
- sample logic
- success criteria
- safety

The Critic produces:
- issues
- severity
- recommendations
- blocking issues

## Security
experiment_reviews are read-only to authenticated browser roles.
Review insertion is server-only using service_role after normal RLS access verification.

Experiment status is not directly updateable by authenticated users.

READY is controlled by:
public.mark_experiment_ready()
which delegates to a private security-definer function that validates:
- user can edit the project
- a review exists
- latest review has zero blocking issues

## Revision loop
Experiment design fields are editable while not READY/ARCHIVED.
Design changes create EXPERIMENT_REVISED audit events.
A new Critic review can then replace NEEDS_REVISION with AI_REVIEWED.

## Staging validation
Observed:
- READY without review: blocked
- blocker review: NEEDS_REVISION
- READY with blockers: blocked
- design revision: EXPERIMENT_REVISED event = 1
- clean review: AI_REVIEWED
- mark ready after clean review: READY
- total reviews: 2
- review audit events: 2

Cross-tenant user B:
- visible experiments: 0
- visible reviews: 0

Synthetic data removed after validation.

## Supabase Advisor
Security Advisor:
- zero findings
