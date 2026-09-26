# Fresh Migration Replay + Security Regression Baseline

**Date:** 2026-09-26  
**Repository:** `atharxai-cloud/innovation-os`  
**Purpose:** Release Hardening — database reproducibility and security regression

## Fresh replay

GitHub Actions now starts a clean local Supabase PostgreSQL environment and runs:

1. `supabase db start`
2. `supabase db reset --local`
3. replay of every repository migration
4. `supabase migration list --local`
5. `supabase/tests/security_regression.sql`

Verified replay chain:

`001 → 019`

## Security regression coverage

The automated SQL suite verifies:

- RLS is enabled on all exposed Innovation OS domain tables.
- `anon` has no direct table grants on protected domain tables.
- `experiment_reviews` is SELECT-only for the authenticated browser role.
- User B cannot see User A project, Gap, or Experiment rows.
- invalid project-stage jumps are rejected at the PostgreSQL boundary.
- an Experiment cannot become `READY` without a Scientific Critic review.
- authenticated clients cannot directly update `experiments.status`.

## Finding discovered by the first replay

The first security regression run exposed a real state-machine bypass:

`projects.current_stage` could be updated directly by an authorized client, bypassing `transition_project_stage()`.

Although the RPC validated sequential transitions, the database table itself did not reject an invalid direct jump.

## Fix

Migration:

`20260926075637_019_enforce_project_stage_machine_trigger.sql`

adds a PostgreSQL BEFORE UPDATE trigger that enforces the allowed chain:

`DISCOVERY → PROBLEM_VALIDATION → EVIDENCE → PRIOR_ART → GAP_DEFINITION → EXPERIMENT_DESIGN → EXPERIMENT_READY`

Any direct invalid jump is rejected regardless of whether it originates from application code, a client, or an AI-driven workflow.

## Verification after fix

- Fresh migration replay: PASS
- migration history verification: PASS
- cross-tenant isolation regression: PASS
- database state-machine regression: PASS
- Experiment READY gate regression: PASS
- direct experiment-status mutation check: PASS
- canonical application quality gate: PASS
- Supabase Staging Security Advisor after migration 019: zero findings

## Permanent CI rule

Every pull request now has two independent release gates:

### quality
- npm ci
- migration integrity
- lint
- typecheck
- unit tests
- production build

### fresh-db-security
- clean Supabase DB startup
- complete migration replay
- migration history verification
- database security regression suite

A PR is not release-safe if either gate fails.
