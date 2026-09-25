# Innovation OS — Engineering Backlog

## Delivery Strategy
Build vertically. Do not build all UI first and “connect backend later.” Each epic closes with working data, authorization, error states, observability, and tests.

## Epic 0 — Foundation & Delivery Pipeline
### Stories
- Initialize production codebase with target framework and TypeScript strict mode.
- Configure Arabic-first RTL/LTR architecture.
- Establish folder/domain boundaries.
- Configure lint, typecheck, unit test, build checks.
- Configure local/staging/production environment strategy.
- Add CI gate on pull requests.
- Add secrets/environment variable conventions.
- Add error tracking/logging baseline.

### Acceptance
- clean install/build/typecheck/test succeed
- app renders Arabic and English routes/content correctly
- no production secrets in repository/client
- main branch protected by CI process

### Dependency
None.

---
## Epic 1 — Supabase Core, Auth, Workspace Isolation
### Stories
- Create separate Supabase local/staging/production projects.
- Add profiles, workspaces, workspace_members.
- Add personal workspace bootstrap.
- Add projects/project_members.
- Implement explicit grants + RLS + indexes.
- Implement auth/session SSR/server helpers.
- Implement cross-workspace security test harness.

### Acceptance
- authenticated user automatically has one personal workspace
- User A cannot read/update/archive User B project
- RLS tests run in CI/staging
- no service-role key in browser

### Dependency
Epic 0.

---
## Epic 2 — Project State Machine & Project Overview
### Stories
- Create problem/assumption/question tables.
- Implement innovation stage enum/model.
- Implement controlled transition service.
- Project create/update/archive API.
- My Innovations screen.
- Project Overview.
- Append audit events for significant changes.

### Acceptance
- project begins at DISCOVERY
- invalid direct stage jumps rejected server-side
- overview renders canonical project state
- archive is soft delete

### Dependency
Epic 1.

---
## Epic 3 — Idea X-Ray
### Stories
- Anonymous Idea X-Ray endpoint with rate limit.
- Typed input/output schema.
- Idea X-Ray specialist agent via LLM gateway.
- Preserve X-Ray seed through sign-in.
- Convert seed to project/problem/assumptions/questions.
- AI run logging and cost tracking.

### Acceptance
- Arabic/English/mixed input supported
- output contains problem/context/beneficiary/assumptions/unknowns/risks/questions/next action
- no fake quality score
- X-Ray survives auth transition
- provider/model can be replaced without domain rewrite

### Dependency
Epics 1–2.

---
## Epic 4 — Project Brain v1 + Navigator
### Stories
- Implement project state reader.
- Implement project snapshot schema/service.
- Implement context pack builder.
- Implement Navigator agent.
- Implement next action persistence/display.
- Trigger snapshot on significant state changes.

### Acceptance
- next action includes reason, blocker, confidence
- snapshot is reconstructible and not source of truth
- system avoids full-project prompt dumping
- recommendation changes generate audit/timeline event

### Dependency
Epics 2–3.

---
## Epic 5 — Evidence Engine
### Stories
- sources/project_sources/claims/claim_sources schema + RLS.
- ScientificSearchProvider interface.
- OpenAlex/Crossref adapter(s), optional additional provider.
- Query expansion Arabic -> English concepts/synonyms.
- Async search job.
- Normalize/dedupe results.
- Save source and relationship to claim.
- Evidence Board.
- Citation-required AI synthesis.

### Acceptance
- every saved source resolves to a real canonical source URL/identifier
- AI scientific claim from engine references source IDs
- Supports/Challenges/Context relations work
- no-results/failure states generate no synthetic citations

### Dependency
Epics 1, 2, 4.

---
## Epic 6 — Prior-Art Discovery
### Stories
- prior_art_items schema + policies.
- PatentSearchProvider interface.
- research/provider reuse where appropriate.
- candidate normalization.
- conceptual similarity LOW/MEDIUM/HIGH.
- comparison UI.
- mandatory legal scope disclaimer.

### Acceptance
- user can run scan and save candidates
- result explains relevance/shared concepts/differences
- no patentability/novelty verdict generated

### Dependency
Epics 4–5.

---
## Epic 7 — Gap Finder
### Stories
- gaps/gap_evidence schema + RLS.
- eligibility gate for minimum context.
- Gap Agent.
- trace outputs to evidence/prior art.
- gap validation status workflow.
- Navigator integration.

### Acceptance
- generation blocked if context insufficient
- new gaps default UNVALIDATED
- every generated gap has reason + supporting context

### Dependency
Epics 5–6.

---
## Epic 8 — Experiment Designer & Scientific Critic
### Stories
- experiments/reviews schema + RLS.
- progressive experiment editor.
- Experiment Agent.
- independent Scientific Critic Agent.
- blocking issue model.
- READY transition guard.

### Acceptance
- complete experiment structure can be saved as draft
- critique identifies blockers/revisions
- READY impossible while blockers exist
- generator and critic run as separate agent types/AI runs

### Dependency
Epic 7.

---
## Epic 9 — Ask My Project
### Stories
- contextual ask endpoint.
- intent classification.
- context pack assembly.
- response schema: Fact / Inference / Recommendation.
- source citations when evidence used.
- guard against prompt injection from stored external content.

### Acceptance
- answers are grounded in project context
- unsupported claims are labeled, not invented
- evidence-derived answers expose sources

### Dependency
Epics 4–8.

---
## Epic 10 — Files & Indexing
### Stories
- private storage bucket and policies.
- file metadata table.
- file type/size validation.
- signed access.
- extraction pipeline for supported formats as needed.
- searchable representation.

### Acceptance
- cross-workspace storage access denied
- executables rejected
- upload/processing failures recoverable

### Dependency
Epic 1.

---
## Epic 11 — Timeline & Decisions
### Stories
- project_decisions/decision_sources.
- append-only audit events.
- timeline read model.
- decision capture UI.

### Acceptance
- meaningful domain events visible chronologically
- audit events cannot be edited/deleted by user
- decision can reference evidence

### Dependency
Epics 2, 5.

---
## Epic 12 — Observability, Cost & Product Analytics
### Stories
- structured server logs.
- error tracking.
- AI token/cost metrics.
- provider latency/error metrics.
- product event tracking.
- research success/no-result/job failure metrics.

### Acceptance
- per AI run tokens/cost visible in logs/admin telemetry
- key funnel events emitted reliably

### Dependency
Runs throughout; production gate before launch.

---
## Epic 13 — Release Hardening
### Stories
- execute scenarios A–G.
- RLS adversarial tests.
- rate-limit tests.
- accessibility audit.
- mobile/RTL QA.
- failure/retry/idempotency tests.
- staging soak test.
- backup/restore validation.

### Production Release Gate
- A Idea -> X-Ray -> Project PASS
- B Evidence -> Save Source PASS
- C Prior Art PASS
- D Evidence+Prior Art -> Gap PASS
- E Gap -> Experiment -> Critic -> Revision PASS
- F Ask My Project grounded PASS
- G Tenant isolation PASS

Scenario G failure blocks release unconditionally.

## Recommended Sprint Sequence
Sprint 0: Epic 0
Sprint 1: Epic 1 + project skeleton from Epic 2
Sprint 2: finish Epic 2 + Epic 3
Sprint 3: Epic 4
Sprint 4: Epic 5
Sprint 5: Epic 6
Sprint 6: Epic 7
Sprint 7: Epic 8
Sprint 8: Epic 9 + Epic 11
Sprint 9: Epic 10 + hardening/observability
Sprint 10: Epic 13

Sequence is dependency-driven; schedule may change, dependency order should not.