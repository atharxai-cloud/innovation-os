# Innovation OS — Project Handoff

**Date:** 2026-09-26  
**Repository:** `atharxai-cloud/innovation-os`  
**Staging Supabase project ref:** `tzthybwsuqufpuhooaey`  
**Status:** MVP build in progress  
**Architecture:** Next.js App Router + TypeScript + Supabase + modular monolith + agentic AI orchestration

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

# 7. Current Work In Progress — Epic 7 Gap Finder

**Important: Epic 7 is NOT merged yet.**

Current branch:
`epic-7/gap-finder`

The following has already been implemented on this branch:

### Database/model
- gaps
- gap_evidence
- gap_prior_art

Gap fields:
- title
- description
- gap_type
- status
- confidence
- assumptions_json
- validation_questions_json
- created_by
- timestamps

Gap types:
- CONTEXT
- COST
- PERFORMANCE
- INTEGRATION
- ACCESSIBILITY
- ENVIRONMENTAL
- OTHER

Gap statuses:
- UNVALIDATED
- VALIDATING
- VALIDATED
- REJECTED

Default saved Gap status:
`UNVALIDATED`

### Security
- RLS enabled
- explicit grants
- workspace/project checks
- source and prior-art relationship checks

Supabase Security Advisor after Gap schema:
- zero security findings

### Gap generation rule
Gap Finder must NOT run without minimum context.

Current minimum context gate:

```
>= 1 saved Evidence source
AND
>= 1 Prior-Art item
```

If not satisfied:
API returns `INSUFFICIENT_CONTEXT`.

### Gap Agent
Already added on branch.

Uses:
- project
- problem
- assumptions
- claims
- saved evidence sources
- saved prior-art items

Output:
- title
- description
- gap_type
- known_limitation
- opportunity_rationale
- assumptions
- validation_questions
- confidence
- evidence_source_ids
- prior_art_ids

Safety:
- Gap is a hypothesis, never a novelty verdict.
- Generated source/prior-art IDs are filtered against IDs actually belonging to the current project before returning or saving.

### APIs already added on branch
- `POST /api/v1/projects/:id/gaps/generate`
- `POST /api/v1/projects/:id/gaps`

### UI already added on branch
Gap Workspace now has:
- Find Potential Gaps
- insufficient-context message
- generated candidate cards
- assumptions
- validation questions
- evidence/prior-art grounding counts
- save Gap Hypothesis
- saved gaps section

---

# 8. IMPORTANT — Epic 7 Staging Test Is Partially In Progress

Before this handoff, an Epic 7 synthetic test was started on staging.

Synthetic users created:

User A:
`cccccccc-cccc-4ccc-8ccc-cccccccccccc`

User B:
`dddddddd-dddd-4ddd-8ddd-dddddddddddd`

Synthetic project:
`db14e803-0a81-401e-834b-36202bd4b3e4`

Synthetic Evidence source:
`30b42399-7bbd-4869-b79e-ddce1f4e72f5`

The project and evidence source currently exist in staging unless cleaned after this handoff.

The next chat MUST either:
1. continue the Epic 7 integration test using these IDs, then clean all synthetic data, or
2. clean them first and restart the test.

Do not forget this.

Expected remaining Epic 7 test sequence:

1. Add one prior-art item to project `db14e803-0a81-401e-834b-36202bd4b3e4`.
2. Save one Gap Hypothesis using:
   - evidence source `30b42399-7bbd-4869-b79e-ddce1f4e72f5`
   - the prior-art item ID
3. Verify:
   - gap count = 1
   - gap_evidence count = 1
   - gap_prior_art count = 1
   - GAP_CREATED audit event = 1
   - status = UNVALIDATED
4. Switch auth context to User B.
5. Verify User B sees:
   - 0 gaps
   - 0 gap_evidence
   - 0 gap_prior_art
6. Clean project, workspaces, memberships, and both synthetic users.
7. Run Supabase Security Advisor.
8. Add Epic 7 validation doc.
9. Open PR.
10. Run CI.
11. Merge only if full CI passes.

---

# 9. Supabase Schema / Migration State

Merged repository migrations currently include through Epic 6.

Files created historically include:
- 004_project_core_state_machine.sql
- 005_harden_project_creation.sql
- 006_enforce_project_state_machine.sql
- 007_ai_run_artifact_foundation.sql
- 008_idea_xray_project_conversion.sql
- 009_remove_unused_ai_record_function.sql
- 010_project_brain_snapshot_engine.sql
- 011_evidence_engine_core.sql
- 012_evidence_save_and_claim_workflow.sql
- 013_index_project_source_saved_by.sql
- 014_evidence_upsert_permissions.sql
- 015_prior_art_discovery.sql

Epic 7 branch includes:
- 016_gap_finder.sql

Note:
During development, some staging schema changes were applied with direct SQL for verification before being committed as migration files. Always compare staging schema and repository migration history before production promotion.

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
7. Replace Idea X-Ray in-memory rate limiter with durable distributed rate limiting.
8. Add production-grade error tracking and structured logs.
9. Add background-job layer for long scientific / prior-art operations.
10. Complete staging → production environment separation and release hardening.

---

# 12. Next Epics After Gap Finder

## Epic 8 — Experiment Designer

Required data model:
- experiments
- experiment_reviews

Experiment fields:
- title
- research_question
- hypothesis
- independent_variable
- dependent_variable
- control_description
- sample_description
- measurement_method
- protocol_json
- success_criteria
- status

Statuses:
- DRAFT
- AI_REVIEWED
- NEEDS_REVISION
- READY
- ARCHIVED

Flow:

```
Validated/selected Gap
→ Research Question
→ Hypothesis
→ Variables
→ Control
→ Measurement
→ Sample
→ Protocol
→ Success Criteria
→ Failure Modes
→ Safety/Ethics
```

## Epic 9 — Scientific Critic

Must be a separate agent from Experiment Designer.

Principle:

> Generator must not grade itself.

Critic checks:
- Does experiment test the hypothesis?
- Is there a control?
- Is the measurement valid?
- Are there confounders?
- Is success criterion explicit?
- Is sample reasoning acceptable for the stage?
- Are there safety/ethical issues?

Experiment cannot become READY while blocking issues remain.

## Epic 10 — Ask My Project

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

## Epic 11 — Release Hardening

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

A, B, C and repeated G checks have already been validated during development.

D is currently in progress in Epic 7.

E and F remain.

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
IN PROGRESS

Experiment Designer
NOT STARTED

Scientific Critic
NOT STARTED

Ask My Project
NOT STARTED

Release Hardening
NOT STARTED
```

The immediate action in the next chat is:

> Continue Epic 7 from branch `epic-7/gap-finder`, finish the partially-started staging validation, clean synthetic data, pass CI, merge the PR, then proceed to Epic 8 Experiment Designer.

Do not restart the project or recreate completed work.
