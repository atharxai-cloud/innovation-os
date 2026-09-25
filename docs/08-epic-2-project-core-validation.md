# Epic 2 — Project Core & State Machine Validation

## Scope
Epic 2 establishes the structured project core that sits below Project Brain and the Innovation Navigator.

## Database entities added
- project_problems
- project_assumptions
- project_questions
- project_snapshots
- audit_events

## State machine
The database enforces the MVP transition chain:

DISCOVERY
→ PROBLEM_VALIDATION
→ EVIDENCE
→ PRIOR_ART
→ GAP_DEFINITION
→ EXPERIMENT_DESIGN
→ EXPERIMENT_READY

Invalid stage jumps are rejected by PostgreSQL.

## Project creation transaction
The project creation RPC runs with SECURITY INVOKER and therefore respects RLS.

Creating one Innovation Project creates atomically:
- project
- problem
- 3 initial validation questions
- 2 initial assumptions

PROJECT_CREATED is produced by an internal trigger and stored in audit_events.

## Validation performed on staging
A synthetic authenticated User A created a project.

Observed:
- project_problems: 1
- project_questions: 3
- project_assumptions: 2
- PROJECT_CREATED events: 1
- initial stage: DISCOVERY

State transition test:
- DISCOVERY → PRIOR_ART: rejected
- DISCOVERY → PROBLEM_VALIDATION: accepted
- final stage: PROBLEM_VALIDATION
- PROJECT_STAGE_CHANGED events: 1

Cross-tenant test using synthetic User B:
- visible projects from User A: 0
- visible project problems: 0
- visible project questions: 0
- visible project assumptions: 0
- visible project audit events: 0

All synthetic test users and data were removed after validation.

## Security
Supabase database Security Advisor after hardening:
- zero database/RLS findings

The existing Auth-level leaked-password-protection warning remains a deployment configuration gate before public onboarding.

## Product behavior implemented
- real My Innovations list
- Create Innovation Project
- Project Overview from structured data
- Project Brain panel
- deterministic initial Navigator
- append-oriented Timeline
- project Archive action
- database-enforced project stages

## Design decision
The first Navigator is deterministic and explainable. AI does not decide the basic project state transition. AI can later enrich recommendations, but the project state remains structured and auditable.
