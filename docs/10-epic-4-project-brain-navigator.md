# Epic 4 — Project Brain + Navigator V1

## Objective
Persist and refresh an explainable Project Brain after significant state changes.

## Architecture
1. Structured project data remains the source of truth.
2. PostgreSQL rebuilds a deterministic Project Brain snapshot.
3. The latest snapshot drives Current Stage, Biggest Unknown, Blocking Issue, and Next Best Action.
4. Optional AI enrichment may improve the biggest unknown, risk summary, and explanation.
5. AI is not allowed to change the project stage or bypass the state machine.

## Significant state changes
The snapshot engine reacts to:
- project problem insert/update
- project assumption insert/update
- project question insert/update
- project stage changes
- project status changes

Rapid writes in the same logical operation are coalesced into the latest snapshot within a one-second window to avoid snapshot spam.

## Snapshot model
project_snapshots remains rebuildable and is not the domain source of truth.

Stored fields:
- summary_json
- stage
- next_best_action_json
- risk_summary_json
- snapshot_version

Deterministic generator:
DETERMINISTIC_NAVIGATOR_V1

AI-enriched generator:
HYBRID_NAVIGATOR_V1

## AI enrichment
The Project Brain agent receives a bounded Context Pack only:
- project title and stage
- problem/context/affected users
- up to 12 open questions
- up to 12 untested assumptions
- deterministic next action

It cannot alter the current stage.
If the provider fails or credentials are absent, the deterministic snapshot remains valid.

## APIs
- GET /api/v1/projects/:id/state
- GET /api/v1/projects/:id/next-action

Both use the authenticated Supabase session and RLS-protected project data.

## Validation on staging
Synthetic project creation produced:
- Snapshot v1
- stage DISCOVERY
- explainable next action
- confidence and blocking issue

After a valid stage transition:
- Snapshot v2
- stage PROBLEM_VALIDATION
- updated reason and blocking issue

Synthetic test data was deleted after validation.

## Security
Supabase database/RLS Security Advisor after migration:
- zero findings

The existing Auth-level leaked-password-protection configuration remains an external release gate.

## Reliability
AI enrichment is fail-open toward the deterministic brain:
- no fabricated fallback output
- no blocked project mutation if AI is unavailable
- no stage mutation by AI
