# Epic 11 — AI Observability, Structured Logging & Cost Accounting

**Date:** 2026-09-26  
**Status:** Implemented — pending final CI gate at authoring time

## Objective

Make every AI execution operationally inspectable without storing raw prompts, raw model outputs, secrets, or private user content in logs.

The system now answers:

- which agent ran
- which model/provider was used
- which workspace/project/user initiated the run
- whether the run succeeded or failed
- OpenAI request ID
- service tier
- input tokens
- cached input tokens
- output tokens
- reasoning tokens
- execution duration
- estimated API cost
- pricing baseline/version
- safe operational metadata
- error code and bounded error message

## Central observed gateway

All actively used OpenAI Responses API workflows are routed through:

`src/lib/ai/observed-openai.ts`

Covered workflows:

- Idea X-Ray
- Project Brain
- Evidence Query Expansion
- Prior-Art Comparison
- Gap Finder
- Experiment Designer
- Scientific Critic
- Ask My Project

The gateway records `RUNNING → SUCCEEDED | FAILED` rather than creating telemetry only after success.

## Structured logging

`src/lib/observability/logger.ts`

Emits JSON events suitable for platform log aggregation:

- `ai.request.started`
- `ai.request.succeeded`
- `ai.request.failed`
- telemetry claim / persistence warnings

Sensitive content keys are excluded. Raw prompt, model output, authorization headers and API keys are not intentionally logged.

## AI run accounting

Migration 020 extends `public.ai_runs` with:

- `actor_id`
- `request_id`
- `endpoint`
- `service_tier`
- `cached_input_tokens`
- `reasoning_tokens`
- `duration_ms`
- `cost_currency`
- `pricing_version`
- `metadata_json`
- `error_message`

Authenticated clients retain read-only RLS-scoped access and cannot insert/update/delete AI run records.

## Cost accounting

`src/lib/ai/pricing.ts`

Pricing baseline:

`openai-standard-2026-09-26`

Supported accounting models:

- GPT-5.6 Luna
- GPT-5.6 Terra
- GPT-5.6 Sol

The estimator distinguishes:

- uncached input
- cached input
- output
- long-context requests above 272K input tokens

For >272K input tokens, the estimator applies the documented GPT-5.6 long-context multipliers:

- input: 2x
- cached input: 2x
- output: 1.5x

Unknown models or incomplete usage do not receive a guessed cost; estimated cost remains null.

Pricing is versioned because provider prices can change.

## Secure pre-auth Idea X-Ray telemetry

Idea X-Ray can run before authentication, so it cannot immediately attach a run to a workspace/project.

Migration 021 introduces:

`public.ai_pre_auth_runs`

Properties:

- server-side operational metadata only
- no raw prompt/output
- RLS enabled
- no anon/authenticated grants
- service-role only
- explicit deny-all policy added by migration 022

The browser receives only the pre-auth run UUID as a reference. It may also display/store operational metadata temporarily, but the server does not trust client-provided token/cost values.

When Idea X-Ray is converted into a project:

1. server loads the pre-auth record using service-role access
2. requires `agent_type = IDEA_XRAY`
3. requires `status = SUCCEEDED`
4. requires `claimed_at IS NULL`
5. recomputes SHA-256 of the original idea
6. requires exact `input_hash` match
7. copies trusted telemetry into `ai_runs`
8. links the artifact to the resulting run
9. marks the pre-auth record claimed

This prevents client-side manipulation of token/cost accounting.

## Security

Security regression now asserts:

- RLS on AI telemetry tables
- no anonymous protected-table access
- authenticated cannot mutate `ai_runs`
- authenticated cannot read or mutate `ai_pre_auth_runs`
- service role remains the server-side telemetry writer

Supabase Security Advisor after migrations 020–022:

**zero findings**

Performance Advisor may report unused indexes on low-traffic Staging. These are not treated as release defects until representative workload exists.

## Database migrations

- `20260926080425_020_ai_observability_cost_accounting.sql`
- `20260926081229_021_pre_auth_ai_observability.sql`
- `20260926081540_022_pre_auth_deny_all_policy.sql`

Fresh-environment replay must pass through migration 022 before merge.

## Next Release-Hardening Work

The next engineering slice is:

1. durable distributed rate limiting
2. background jobs / queue for longer research and AI workloads
3. external error tracking / alerting integration
4. telemetry retention/cleanup policy for unclaimed pre-auth runs
5. automated final release scenarios A–G
6. staging → production promotion gate
