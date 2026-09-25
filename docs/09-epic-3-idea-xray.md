# Epic 3 — Idea X-Ray

## Product goal
Turn an unstructured idea/problem into a typed Project Seed without praising the idea, inventing evidence, or generating a finished solution.

## Flow
Landing / Idea X-Ray
→ POST /api/v1/idea-xray
→ LLM Gateway
→ Structured JSON Schema
→ Application validation
→ Result UI
→ local browser persistence
→ Login / Signup
→ Convert
→ structured Project State

## Privacy decision
Pre-auth Idea X-Ray is transient:
- raw idea is not written to Supabase before authentication
- result is stored locally in the user's browser
- after authentication, conversion writes structured entities into the user's Personal Workspace

This avoids exposing an anon-owned innovation-data table.

## LLM Gateway
Provider: OpenAI Responses API
Default model: gpt-5.6-luna
Configured via:
- OPENAI_API_KEY
- OPENAI_IDEA_XRAY_MODEL

The Domain layer is not tied to a provider-specific UI.

Structured Outputs use JSON Schema and are validated again by application code.

## Guardrails
- 20–5000 character input
- 25 second timeout
- one retry on transient HTTP failures
- 2200 max output tokens
- no evidence claims without supplied evidence
- no innovation scores
- no novelty or patentability verdict
- no fake fallback result on provider failure

The current in-memory rate limiter is a staging guard only. Public release requires a durable distributed rate limiter at the deployment edge/backend.

## Conversion mapping
Idea X-Ray output maps to:
- projects
- project_problems
- project_assumptions
- project_questions
- audit_events

## AI observability
ai_runs and ai_artifacts are server-owned.
The browser has read-only access under RLS.

SUPABASE_SERVICE_ROLE_KEY is server-only and must never be exposed through NEXT_PUBLIC_ variables.

## Database validation on staging
Conversion test produced:
- 1 project problem
- 2 assumptions
- 2 critical questions
- 2 unknown questions
- 1 PROJECT_CREATED event
- stage DISCOVERY

Cross-tenant User B visibility:
- project: 0
- problem: 0
- assumptions: 0
- questions: 0
- audit events: 0

Synthetic data was deleted after the test.

## Release gates still external to source code
- Configure OPENAI_API_KEY in deployment secrets.
- Configure SUPABASE_SERVICE_ROLE_KEY in deployment secrets for AI telemetry.
- Enable Supabase Leaked Password Protection before public onboarding.
- Replace in-memory rate limiting with durable distributed rate limiting before public launch.
