# Innovation OS — Database & RLS Specification

## 1. Principles
- PostgreSQL is source of truth.
- Every table in an exposed schema uses explicit grants + RLS + policies.
- Workspace is the tenant boundary.
- Authorization data must not rely on user-editable metadata.
- Prefer membership lookup functions with carefully scoped privileges only when necessary.
- Views exposed to clients must use `security_invoker = true` where supported.
- `service_role` never appears in the browser.

## 2. Extensions
Planned:
- pgcrypto (UUID helpers if needed)
- vector (pgvector)
- pg_trgm (text similarity / fuzzy search where useful)

Enable only when used.

## 3. Enums / Domains
Suggested DB enums or CHECK constraints:
- workspace_type: PERSONAL, ORGANIZATION
- workspace_role: OWNER, ADMIN, MEMBER, VIEWER
- member_status: ACTIVE, INVITED, SUSPENDED
- project_role: OWNER, EDITOR, MENTOR, VIEWER
- project_status: ACTIVE, ARCHIVED
- project_visibility: PRIVATE
- innovation_stage: DISCOVERY, PROBLEM_VALIDATION, EVIDENCE, PRIOR_ART, GAP_DEFINITION, EXPERIMENT_DESIGN, EXPERIMENT_READY
- assumption_status: UNTESTED, SUPPORTED, CHALLENGED, REJECTED
- claim_source_relationship: SUPPORTS, CHALLENGES, CONTEXT
- similarity_level: LOW, MEDIUM, HIGH
- gap_status: UNVALIDATED, VALIDATING, SUPPORTED, REJECTED
- experiment_status: DRAFT, AI_REVIEWED, NEEDS_REVISION, READY, ARCHIVED
- file_classification: PRIVATE, PROJECT, PUBLIC
- ai_run_status: PENDING, RUNNING, SUCCEEDED, FAILED, CANCELLED

## 4. Core Tables
### profiles
PK `id uuid references auth.users(id)`
Fields: display_name, preferred_language, country, timestamps.

### workspaces
PK id uuid
owner_id -> profiles/auth.users
name, type, timestamps.
Indexes: owner_id, type.

### workspace_members
Composite unique(workspace_id,user_id)
workspace_id FK
user_id FK
role, status, created_at.
Indexes: user_id; workspace_id+status.

### projects
id, workspace_id, owner_id, title, slug, description, current_stage, status, visibility, timestamps, archived_at.
Unique: workspace_id + slug for active namespace.
Indexes: workspace_id+updated_at, owner_id, current_stage, status.

### project_members
unique(project_id,user_id)
role, created_at.
Indexes user_id, project_id.

## 5. Problem Domain
### project_problems
One active canonical problem per project in MVP unless versioning is later added.
Unique project_id recommended.

### project_assumptions
project_id, category, statement, status, evidence_strength, timestamps.
Index project_id+status.

### project_questions
project_id, question, type, priority, status, created_at, resolved_at.
Index project_id+status+priority.

## 6. Evidence
### sources
workspace_id required.
external_id, doi, title, authors_json jsonb, published_at, url, metadata_json jsonb, created_at.
Uniqueness strategy: workspace_id + normalized external identity; fallback canonical URL hash.
Indexes: workspace_id, doi, external_id, published_at; FTS generated/search column later.

### project_sources
PK may be composite(project_id,source_id)
relevance, notes, saved_by, created_at.

### claims
project_id, statement, claim_type, status, confidence, timestamps.
Index project_id+status.

### claim_sources
unique(claim_id,source_id,relationship)
relationship, notes.

## 7. Prior Art
### prior_art_items
project_id, source_id nullable when external item cannot be normalized as a scientific source, prior_art_type, technical_summary, similarity_level, differences_json, created_at.
Prefer canonical source record when possible.
Index project_id+similarity_level.

## 8. Gaps
### gaps
project_id, title, description, gap_type, status default UNVALIDATED, confidence, timestamps.

### gap_evidence
gap_id, source_id, relationship.
Unique gap/source/relationship.

### gap_prior_art
gap_id, prior_art_item_id, relationship, notes.
Unique gap/prior_art_item/relationship.

Direct traceability from a Gap Hypothesis to both Evidence and Prior Art is an MVP requirement, not a deferred enhancement.

## 9. Experiments
### experiments
project_id, title, research_question, hypothesis, independent_variable, dependent_variable, control_description, sample_description, measurement_method, protocol_json, success_criteria, status, timestamps.

### experiment_reviews
experiment_id, review_type, issues_json, recommendations_json, reviewed_at, model_metadata_json.
Append-oriented; no overwrite of historical reviews.

## 10. Decisions
### project_decisions
project_id, decision, reason, created_by, created_at.

### decision_sources
unique(decision_id,source_id).

## 11. AI
### ai_runs
workspace_id, project_id nullable for pre-project Idea X-Ray, agent_type, status, input_hash, provider/model, token counts, estimated_cost, timestamps, error_code.
Indexes workspace_id+started_at, project_id+started_at, status.

### ai_artifacts
ai_run_id, artifact_type, content_json, version, created_at.
Unique(ai_run_id,artifact_type,version).

## 12. Project Brain
### project_snapshots
project_id, snapshot_version, summary_json, stage, next_best_action_json, risk_summary_json, created_at.
Unique(project_id,snapshot_version).
Index project_id+created_at desc.
Snapshots immutable after creation.

## 13. Audit
### audit_events
workspace_id, project_id nullable, actor_id nullable, event_type, entity_type, entity_id, metadata_json, created_at.
Append-only.
No user update/delete policies.
Indexes workspace_id+created_at, project_id+created_at, entity_type+entity_id.

## 14. Files
### files
workspace_id, project_id nullable, storage_path, original_name, mime_type, size, classification, uploaded_by, created_at.
Unique storage_path.
Indexes workspace_id, project_id, uploaded_by.

## 15. Workspace Bootstrap
On first authenticated use:
- create profile if absent
- create PERSONAL workspace
- create OWNER membership
All in one server-side transaction or trusted database function with strict auth check.

## 16. RLS Authorization Model
### Core helper predicates
Conceptually:
- `is_workspace_member(workspace_id)`
- `workspace_role_at_least(workspace_id, role)`
- `is_project_member(project_id)`
- `project_role_at_least(project_id, role)`

If helper functions are SECURITY DEFINER:
- place in non-exposed schema
- set explicit search_path
- revoke execute from PUBLIC
- grant only to authenticated as required
- verify `auth.uid()` internally
- run database advisors

Prefer direct EXISTS predicates where practical.

## 17. Policy Matrix
### profiles
- SELECT own profile
- UPDATE own profile
- INSERT only own id during bootstrap

### workspaces
- SELECT active members
- UPDATE OWNER/ADMIN according to allowed fields
- DELETE OWNER only, and likely via controlled server use case

### workspace_members
- SELECT workspace members for active members
- INSERT/UPDATE/DELETE OWNER/ADMIN with restrictions preventing ownership takeover

### projects
- SELECT members of workspace/project as allowed
- INSERT authenticated members with creation rights
- UPDATE OWNER/EDITOR or workspace admin according to policy
- archive rather than hard-delete in MVP

### domain project tables
Access is inherited through project -> workspace/member relation.
- SELECT project roles allowed
- mutate OWNER/EDITOR; MENTOR limited to feedback/review-related records where explicitly intended
- VIEWER read only

### sources
Workspace scoped. A source may be attached to several projects in same workspace.

### ai_runs / ai_artifacts
Readable by workspace members allowed to access the related project; writes should normally be server-side.

### audit_events
SELECT based on workspace membership if exposed to product timeline; INSERT from trusted application path; no UPDATE/DELETE.

## 18. Explicit Grants
For every new `public` table used by authenticated clients/server clients through Data API:
- GRANT only required operations to `authenticated`
- `anon` only where specifically required, e.g. no private table access
- service role as operationally required
- then RLS policies define row access

Do not assume new tables are automatically accessible through Data API.

## 19. Storage Design
Buckets:
- `project-files` private
- optional later public asset bucket separate from innovation data

Object path convention:
`{workspace_id}/{project_id}/{file_id}/{safe_filename}`

Storage policies must validate membership based on path-bound workspace/project.
Signed URLs used for private access.

## 20. Search
### FTS
Use searchable text representation for:
- sources
- decisions
- experiments
- extracted file text (when introduced)

Arabic and English may require normalized multilingual search strategy rather than one language-specific dictionary.

### Vector Search
Embeddings are retrieval support, not source of truth.
Store embeddings in a separate searchable table or associated search document table rather than adding vector columns indiscriminately to all domain tables.

## 21. Migration Order
1. extensions
2. enums/check constraints
3. core identity/workspace/project tables
4. domain tables
5. indexes/constraints
6. helper functions if needed
7. explicit grants
8. RLS enablement
9. policies
10. storage bucket/policies
11. verification queries/tests

## 22. RLS Test Matrix — Production Blocking
Two users, two personal workspaces, two projects.
Tests:
- cross-workspace SELECT denied
- cross-workspace UPDATE denied
- cross-workspace DELETE/archive denied
- cross-project domain entity access denied
- storage cross-workspace read denied
- storage cross-workspace write denied
- viewer cannot mutate
- editor cannot alter workspace membership
- mentor permissions limited as defined
- service key absent from client bundle

Any failure blocks production.