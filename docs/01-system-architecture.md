# Innovation OS — System Architecture Specification

## 1. Objective
Define the production architecture for the MVP of Innovation OS. The system must convert an unstructured idea into a structured innovation project that progresses through evidence, prior-art discovery, gap definition, and experiment design while always exposing the next best action.

## 2. Architectural Principles
- Modular monolith first; no microservices in MVP.
- Project State Machine + Project Knowledge Model + Agentic Orchestration are the product core.
- Supabase is the canonical backend for Auth, Postgres, Storage, RLS, pgvector, and FTS.
- Next.js App Router + TypeScript is the target application framework.
- Arabic-first with native RTL/LTR and mixed Arabic/English terminology support.
- External research and patent systems are behind adapters.
- All AI outputs that affect project state are typed, auditable, versioned, and attributable to an AI run.
- Long-running tasks are asynchronous and idempotent.
- Sensitive tenant data is isolated by workspace boundary.

## 3. Logical Layers
1. UX Layer — landing, workspace, evidence, prior art, gap, experiment, files, timeline, settings.
2. Application Layer — route handlers/server actions, validation, authorization checks, use cases.
3. Domain Layer — projects, workspaces, evidence, prior art, gaps, experiments, decisions, brain state.
4. AI Orchestration Layer — orchestrator, specialist agents, context builder, LLM gateway.
5. Tool Layer — scientific search, patent search, source resolution, database services, file parsing.
6. Persistence Layer — Postgres, Storage, search indexes, vector embeddings, audit log.
7. External Provider Layer — OpenAlex, Crossref, Semantic Scholar or equivalent, patent/public databases, LLM providers.

## 4. Deployment Topology
### Environments
- local
- staging
- production

Each environment must use separate:
- Supabase project/database
- API keys/secrets
- storage buckets
- AI provider credentials
- analytics/error tracking projects

No production database is used for development or QA.

## 5. Frontend / Application Runtime
Target:
- Next.js App Router
- TypeScript strict mode
- React Server Components where appropriate
- Server Actions/Route Handlers only when consistent with API boundary
- Tailwind CSS
- accessible component primitives
- i18n with Arabic default and English native support

### Route Groups
- `(marketing)` landing / product education
- `(auth)` sign-in / account creation
- `(app)` my innovations / account
- `(project)` project workspace routes
- `api/v1/*` stable HTTP API surface

## 6. Domain Modules
### auth
Supabase session, server client, user profile bootstrap.

### workspaces
Personal workspace bootstrap, membership and role model, future organization support.

### projects
Project CRUD, stage machine, archive, membership, overview.

### research
Evidence search, source normalization, claims, claim-source relationships.

### prior-art
Candidate discovery, conceptual comparison, legal disclaimer enforcement.

### gaps
Gap hypothesis creation, validation state, traceability to evidence and prior art.

### experiments
Experiment creation, editing, independent scientific critique, readiness gate.

### project-brain
Structured state reader, snapshot generation, next-best-action model, risk/unknown summary.

### ai
Orchestrator, specialist agents, LLM gateway, typed schemas, AI run logging, budgets.

### files
Upload, classification, validation, text extraction, indexing.

### audit
Append-only domain audit events.

## 7. Project State Machine
Allowed MVP progression:

DISCOVERY -> PROBLEM_VALIDATION -> EVIDENCE -> PRIOR_ART -> GAP_DEFINITION -> EXPERIMENT_DESIGN -> EXPERIMENT_READY

Stage is not advanced only because AI suggests it. Advancement requires domain conditions.

### Example minimum transition conditions
- DISCOVERY -> PROBLEM_VALIDATION: structured problem exists.
- PROBLEM_VALIDATION -> EVIDENCE: critical problem claims/questions exist.
- EVIDENCE -> PRIOR_ART: at least one relevant source saved and unsupported claims identified.
- PRIOR_ART -> GAP_DEFINITION: prior art candidates reviewed/retained.
- GAP_DEFINITION -> EXPERIMENT_DESIGN: one gap selected with UNVALIDATED/VALIDATING state and linked context.
- EXPERIMENT_DESIGN -> EXPERIMENT_READY: experiment critic has no blocking issues and user accepts revision.

Transitions are implemented in domain services, not the client.

## 8. Project Brain
Project Brain is a derived structured state, not chat history.

Inputs:
- problem
- assumptions
- questions
- claims
- sources
- prior art
- gaps
- experiments/reviews
- decisions
- files/artifacts
- timeline/audit events

Output snapshot:
- stage
- state summary
- biggest unknown
- critical risk
- next best action
- reason
- blocker
- confidence

Snapshots are rebuildable and never replace domain tables as source of truth.

## 9. AI Architecture
### Orchestrator responsibilities
- identify intent
- load minimal context pack
- choose specialist agent/tool
- enforce tool allow-list
- enforce cost/token limits
- validate typed output
- persist AI run and artifacts
- trigger Project Brain update when significant state changes

### Specialist agents
- Idea X-Ray Agent
- Evidence Agent
- Prior-Art Agent
- Gap Agent
- Experiment Agent
- Scientific Critic Agent
- Navigator Agent
- Project Brain Summarizer

### Principle
Generator must not grade itself. Experiment design and scientific critique are independent agent tasks.

## 10. LLM Gateway
Single internal interface:
- classify/fast model
- reasoning model
- embedding model

Domain code must not depend directly on a provider SDK.

Gateway handles:
- provider/model selection
- retries
- timeout
- token budgets
- cost estimation
- structured output validation
- provider metadata capture

## 11. Context Pack Builder
Never send the complete project by default.

Context is selected by intent.
Example experiment critique context:
- current project summary
- selected gap
- relevant claims
- linked sources
- current experiment
- previous review issues
- recent decisions

## 12. Research Adapter Layer
Interfaces:
- ScientificSearchProvider
- SourceMetadataProvider
- PatentSearchProvider

MVP providers are selected behind the interface, allowing replacement without changing product logic.

Normalized source object includes:
- external identifier
- canonical URL
- title
- authors
- publication date
- source type
- metadata
- abstract/snippet when legally allowed
- retrieval timestamp

## 13. Background Jobs
Long-running operations:
- scientific search
- prior-art search
- large synthesis
- file parsing
- re-indexing
- snapshot generation

Required semantics:
- PENDING / RUNNING / SUCCEEDED / FAILED / CANCELLED
- idempotency key
- retry count
- timeout
- failure reason
- progress metadata

MVP job runner may be an external durable workflow provider or a Postgres-backed queue, but the application uses an internal job interface.

## 14. API Boundary
Base: `/api/v1`

Core endpoints:
- projects CRUD
- idea-xray
- evidence search/save/list
- prior-art search/list
- gaps generate/create/update
- experiments create/update/review
- project state
- ask project
- next action

Every mutation performs server-side authz and schema validation.

## 15. Security Boundaries
- browser receives publishable key only
- service role is server-only
- RLS is mandatory for private data
- every sensitive record is workspace-bound directly or provably through parent relation
- signed URLs for private file access
- external source text is untrusted
- prompt injection cannot modify system/tool permissions
- rate limit AI and external searches
- file validation rejects executables

## 16. Observability
Minimum from MVP:
- structured logs
- error tracking
- request latency
- job failures
- external provider latency/errors
- AI run latency/tokens/cost
- search success/no-result rate
- project stage changes

## 17. Product Analytics
Events:
- idea_xray_started
- idea_xray_completed
- project_created
- evidence_search_started
- source_saved
- prior_art_search_completed
- gap_created
- experiment_created
- experiment_reviewed
- next_action_completed
- project_returned

North Star metric: Validated Innovation Progress Events.

## 18. Reliability / Change Management
- migrations version controlled
- no destructive production migrations without staged rollout
- daily backups
- staging required
- release gated by end-to-end flows and RLS cross-tenant tests

## 19. MVP Release Gate
Must pass:
A. Idea -> X-Ray -> Project
B. Project -> Evidence -> Saved Source
C. Project -> Prior Art
D. Evidence + Prior Art -> Gap
E. Gap -> Experiment -> Critic -> Revision
F. Ask My Project grounded in stored project data
G. User A cannot access User B workspace/project data

Any failure in G blocks release.