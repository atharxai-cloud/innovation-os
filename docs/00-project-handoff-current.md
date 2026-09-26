# Innovation OS — Project Handoff

**Date:** 2026-09-26  
**Repository:** `atharxai-cloud/innovation-os`  
**Staging Supabase project ref:** `tzthybwsuqufpuhooaey`  
**Status:** MVP build in progress  
**Architecture:** Next.js App Router + TypeScript + Supabase + modular monolith + agentic AI orchestration

**Current main HEAD verified:** `03cd2cce99a469b1a5967d4aa93b524eb3e39d68`  
**Current implementation status:** Epics 1–10 are present on `main`; Epic 11 is the next product epic.  
**Staging security status:** Supabase Security Advisor = zero findings at verification.  

---

# 1. Product Definition

Innovation OS is an Arabic-first innovation/research operating system that takes an unstructured idea and moves it toward an experiment-ready innovation project.

Core path:

```
IDEA
↓
UNDERSTAND
↓
EVIDENCE
↓
PRIOR ART
↓
GAP
↓
EXPERIMENT
```

Across the whole journey:

```
PROJECT BRAIN
+
INNOVATION NAVIGATOR
```

The system must always answer:

> What should this innovator do next — and why?

Project State, structured domain data, and explicit source relationships are the product core. Chat history is not the source of truth.

---

# 2. MVP Capabilities

The approved MVP consists of:

1. Idea X-Ray
2. Innovation Project Workspace
3. Project Brain
4. Evidence Engine
5. Prior-Art Discovery
6. Gap Finder
7. Experiment Designer + Scientific Critic
8. Innovation Navigator

Not in MVP:
- marketplace
- community feed
- school administration
- competition system
- courses
- CAD/electronics simulation
- patent filing
- funding marketplace
- presentation/poster/business-plan generators

---

# 3. Architecture Principles Already Adopted

- Next.js App Router + TypeScript.
- Modular Monolith First.
- Supabase Auth.
- PostgreSQL as primary database.
- Supabase Storage for future file layer.
- PostgreSQL RLS as authorization source of truth.
- Explicit Grants for new public-schema tables.
- Multi-tenant from day one through `workspace_id`.
- Personal Workspace created for each user.
- No service-role key in browser code.
- Structured Project State instead of chatbot memory.
- Project Brain snapshots are rebuildable and not domain source of truth.
- Agents cannot execute arbitrary SQL.
- Provider-specific integrations sit behind adapters.
- AI must fail without fabricating results.
- External documents/content are untrusted input.
- Prior-art similarity is conceptual only; no legal patentability/novelty verdict.
- Security is part of every migration, not added later.

---

# 4. Environments

Target architecture:

```
local
staging
production
```

Current active technical environment:

**Supabase staging**
- project ref: `tzthybwsuqufpuhooaey`

Production is not yet public-release-ready.

---

# 5. CI / Engineering Discipline

GitHub repository:
`atharxai-cloud/innovation-os`

All major implementation work has been done through feature branches + PRs + CI.

Canonical quality gate:

```
npm ci
lint
typecheck
unit tests
production build
```

Major merged PRs have passed the full gate.

Do not bypass CI or commit destructive migrations directly to production.

---

# 6. Completed Epics

## Epic 1A — Supabase foundation
Completed.

Includes:
- profiles
- workspaces
- workspace_members
- projects
- project_members
- workspace isolation
- RLS helpers
- personal workspace bootstrap

## Epic 1B — Auth + SSR
Completed and merged.

Includes:
- Supabase SSR client
- browser/server clients
- Next.js 16 `proxy.ts`
- signup
- login
- logout
- auth callback
- protected routes
- session refresh

## Epic 2 — Project Core + State Machine
Completed and merged.

Includes:
- project_problems
- project_assumptions
- project_questions
- project_snapshots
- audit_events
- Project Overview
- My Innovations
- Create Project
- Archive instead of hard delete
- Timeline

Database-enforced stage chain:

```
DISCOVERY
→ PROBLEM_VALIDATION
→ EVIDENCE
→ PRIOR_ART
→ GAP_DEFINITION
→ EXPERIMENT_DESIGN
→ EXPERIMENT_READY
```

Invalid stage jumps are rejected in PostgreSQL.

## Epic 3 — Idea X-Ray
Completed and merged.

Flow:

```
Raw idea
→ OpenAI Responses API
→ strict JSON schema
→ application validation
→ Idea X-Ray result
→ auth continuation
→ convert to structured Project State
```

Structured output includes:
- project title
- problem
- context
- affected users
- proposed direction
- assumptions
- unknowns
- risks
- critical questions
- suggested search directions
- next best action

Pre-auth ideas are not written to Supabase.

## Epic 4 — Project Brain + Navigator V1
Completed and merged.

Project Brain snapshots contain:
- current stage
- biggest unknown
- blocking issue
- risk summary
- next best action
- reason
- confidence
- snapshot version

Architecture:
- deterministic PostgreSQL Navigator is always available
- optional AI enrichment improves explanation/risk/unknown
- AI cannot change the stage or bypass the state machine
- significant state changes refresh Project Brain

APIs:
- `GET /api/v1/projects/:id/state`
- `GET /api/v1/projects/:id/next-action`

## Epic 5 — Evidence Engine
Completed and merged.

Data model:
- sources
- project_sources
- claims
- claim_sources

Relationships:
- SUPPORTS
- CHALLENGES
- CONTEXT

Claim statuses:
- SUPPORTED
- MIXED
- UNSUPPORTED
- UNKNOWN

Providers:
- OpenAlex as primary academic discovery provider
- Crossref as DOI resolver / metadata enrichment

Evidence flow:

```
Claim
→ Search Evidence
→ OpenAlex
→ canonical source normalization
→ Crossref DOI enrichment
→ save source
→ link to claim
→ claim status refresh
→ Timeline / Project Brain refresh
```

Verified:
- duplicate DOI => one canonical source
- SUPPORTS => SUPPORTED
- SUPPORTS + CHALLENGES => MIXED
- cross-tenant visibility => zero

## Epic 6 — Prior-Art Discovery
Completed and merged.

Latest merged commit after Epic 6:
`e18cf9f3e83551bb54837f27b4efc5e2423e7301`

Data:
- prior_art_items

Research provider:
- OpenAlex

Patent provider adapter:
- EPO Open Patent Services (OPS)

Patent adapter behavior:
- requires runtime `EPO_OPS_CONSUMER_KEY`
- requires runtime `EPO_OPS_CONSUMER_SECRET`
- if credentials are absent, patent results are not fabricated; UI clearly marks patent search unavailable

Comparison output:
- technical summary
- LOW / MEDIUM / HIGH conceptual similarity
- similarity reasons
- shared concepts
- key differences
- limitations
- explicit legal disclaimer

Verified on staging:
- saved Prior-Art item
- linked project source
- PRIOR_ART_SAVED Timeline event
- cross-tenant visibility => zero
- synthetic test data cleaned

PR #16 merged successfully.
CI passed completely.

---

# 7. Epic 7 — Gap Finder

Completed and present on `main`.

Implementation includes:
- `gaps`
- `gap_evidence`
- `gap_prior_art`
- grounded Gap Agent
- minimum context gate: at least one saved Evidence source + one Prior-Art item
- server-side filtering of generated Evidence/Prior-Art IDs to the active project
- RLS + explicit grants + project/workspace relationship checks
- saved Gap default status `UNVALIDATED`
- `GAP_CREATED` audit event
- Gap Workspace UI

Staging validation documented in:
`docs/13-epic-7-gap-finder.md`

Verified outcomes:
- one Gap saved as `UNVALIDATED`
- evidence link = 1
- prior-art link = 1
- `GAP_CREATED` event = 1
- cross-tenant user sees zero Gap data
- synthetic validation data removed

Legacy branch `epic-7/gap-finder` is behind current `main` and must not be re-merged.

---

# 8. Epic 8/9 — Experiment Designer + Scientific Critic

Completed and present on `main`.

Repository migrations:
- `017_experiment_designer_critic.sql`
- `018_experiment_revision_audit.sql`

Implemented:
- `experiments`
- `experiment_reviews`
- Experiment Designer agent
- separate Scientific Critic agent
- revision loop
- audit events
- explicit READY database gate

Status flow:

```
DRAFT
→ Scientific Critic
→ NEEDS_REVISION | AI_REVIEWED
→ READY
```

Safety and architecture:
- Generator does not grade itself.
- Browser cannot directly write experiment status.
- `experiment_reviews` are read-only to authenticated browser roles.
- READY requires a Scientific Critic review and zero blocking issues.
- AI cannot bypass project authorization or the Project State Machine.

Staging validation documented in:
`docs/14-epic-8-9-experiment-critic.md`

Verified outcomes include:
- READY without review blocked
- blocking review forces `NEEDS_REVISION`
- READY with blockers blocked
- revision audit event created
- clean review produces `AI_REVIEWED`
- explicit READY action succeeds only after zero-blocker review
- cross-tenant visibility = zero
- synthetic validation data removed

---

# 9. Supabase Schema / Migration State

Migration history reconciliation completed on Staging.

Repository migration files are now normalized to Supabase-compatible 14-digit versions and match the Staging migration history.

Current baseline includes migrations 001–019.
- `20260926070751_015_prior_art_discovery.sql`
- `20260926071331_016_gap_finder.sql`
- `20260926072335_017_experiment_designer_critic.sql`
- `20260926072336_018_experiment_revision_audit.sql`
- `20260926075637_019_enforce_project_stage_machine_trigger.sql`

The previously missing Staging history entries for 015–018 were marked as applied only after verifying that the corresponding schema objects, functions, triggers, grants, RLS policies, and constraints already existed. Their DDL was not re-run.

Current Staging checks:
- migration history contains 001–018
- `gaps`, `gap_evidence`, `gap_prior_art`, `experiments`, and `experiment_reviews` have RLS enabled
- anonymous access to these tables is not granted
- authenticated grants follow the intended least-privilege model
- Supabase Security Advisor = zero findings

CI now runs `npm run migration:check` and rejects:
- migration filenames without a 14-digit timestamp
- duplicate migration versions

Rule going forward:

> Never modify the remote schema directly. Every schema change must be represented by a timestamped migration file and pass migration integrity + CI before promotion.

Fresh-environment replay is now automated in CI and has passed through migration 019. The first run exposed a direct `projects.current_stage` bypass; migration 019 fixed it with a PostgreSQL BEFORE UPDATE transition guard. Full details: `docs/17-fresh-migration-security-regression.md`.

---

# 10. Runtime Environment Variables

Core Supabase:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

OpenAI:
```
OPENAI_API_KEY=
OPENAI_IDEA_XRAY_MODEL=gpt-5.6-luna
OPENAI_PROJECT_BRAIN_MODEL=gpt-5.6-luna
OPENAI_EVIDENCE_QUERY_MODEL=gpt-5.6-luna
OPENAI_PRIOR_ART_MODEL=gpt-5.6-luna
OPENAI_GAP_MODEL=gpt-5.6-luna
```

Evidence providers:
```
OPENALEX_API_KEY=
CROSSREF_MAILTO=
```

Patent provider:
```
EPO_OPS_CONSUMER_KEY=
EPO_OPS_CONSUMER_SECRET=
```

No service-role or secret key may use `NEXT_PUBLIC_`.

---

# 11. Remaining External Release Gates

Before public onboarding:

1. Configure `OPENAI_API_KEY` in deployment secrets.
2. Configure `SUPABASE_SERVICE_ROLE_KEY` server-side only.
3. Configure OpenAlex key for predictable production quota.
4. Configure Crossref mailto.
5. Register/configure EPO OPS credentials for patent search.
6. Enable Supabase Leaked Password Protection.
7. Complete durable distributed rate limiting.
8. Add production-grade error tracking and structured logs.
9. Add background-job layer for long scientific / prior-art operations.
10. Fresh-environment migration replay: COMPLETED and automated in CI.
11. Expand observability, background jobs, AI cost accounting, and release scenario automation.
12. Complete staging → production environment separation and release hardening.

---

# 12. Next Epics

Epic 7, Epic 8, Epic 9, and Epic 10 are complete on `main`.

## Epic 10 — Ask My Project

Completed on `main`.

Uses a bounded Project Context Pack and grounded response classes:
- Fact
- Inference
- Recommendation

Implementation is documented in `docs/15-epic-10-ask-my-project.md`.

## Epic 11 — Release Hardening

Must use Project Context Pack, not whole project dump.

Answers must distinguish:
- Fact
- Inference
- Recommendation

Questions include:
- ماذا أثبتنا؟
- ما أكبر نقطة ضعف؟
- ما الادعاءات غير المدعومة؟
- لماذا هذا المصدر مهم؟
- ما الفرق بين الحل والأعمال السابقة؟
- ما التجربة التالية؟


Includes:
- durable rate limiting
- jobs/queue
- observability
- structured logs
- AI cost accounting
- security regression tests
- final release scenarios A–G
- staging-to-production promotion

---

# 13. MVP Release Scenarios Still Required

The product must pass:

### A
Idea → X-Ray → Project

### B
Project → Evidence → Saved Source

### C
Project → Prior Art

### D
Evidence + Prior Art → Gap

### E
Gap → Experiment → Critic → Revision

### F
Ask My Project answers from Project Data

### G
User A cannot access User B data

A, B, C, D, E, F and repeated G checks have been validated during development.

---

# 14. What NOT To Do Next

Do not:
- build school administration
- add community/social features
- add funding marketplace
- build presentation/poster generator
- add gamification
- build CAD/prototype simulators
- start organization admin
- redesign architecture into microservices
- replace structured data with chat history
- allow AI to control stage transitions
- claim patentability or novelty

Until MVP path reaches Experiment Ready.

---

# 15. CTO Decision at Handoff

Current product maturity:

```
Idea
✓

Idea X-Ray
✓

Project Core
✓

Project Brain / Navigator
✓

Evidence Engine
✓

Prior-Art Discovery
✓

Gap Finder
✓

Experiment Designer
✓

Scientific Critic
✓

Ask My Project
✓

Release Hardening
IN PROGRESS
```

The immediate action in the next chat is:

> Migration history is reconciled and fresh-environment replay/security regression are automated and passing through migration 019. Continue Epic 11 with observability, background jobs, AI cost accounting, expanded security regression, and final A–G release validation before Production promotion.

Do not restart the project or recreate completed work.
