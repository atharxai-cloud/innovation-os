# Epic 5 — Evidence Engine

## Objective
Connect project claims to verifiable scholarly sources and make evidence status explicit.

## Providers
### OpenAlex
Primary scholarly discovery provider.
- /works search endpoint
- text search across scholarly work metadata
- optional API key via OPENALEX_API_KEY

### Crossref
DOI resolver and metadata enrichment provider.
- REST API v1
- polite pool via CROSSREF_MAILTO
- used on save when DOI is present

## Flow
Project Claim
→ Evidence Search
→ optional query expansion
→ OpenAlex normalized results
→ select source
→ Crossref DOI enrichment
→ save canonical source
→ link source to project
→ optional Claim relationship
→ Claim status refresh
→ Timeline / Project Brain refresh

## Evidence relationships
- SUPPORTS
- CHALLENGES
- CONTEXT

Claim status:
- SUPPORTS only → SUPPORTED
- SUPPORTS + CHALLENGES → MIXED
- no evidence → UNSUPPORTED

## Data model
- sources
- project_sources
- claims
- claim_sources

Sources are deduplicated per workspace by DOI first, then provider external ID.

## Privacy and authorization
All Evidence Engine tables use RLS.
Cross-workspace access is denied.
The save RPC runs as SECURITY INVOKER and therefore remains constrained by RLS and explicit grants.

## External content policy
External papers and metadata are untrusted content.
The Evidence Engine does not allow retrieved source text to alter system instructions or tool permissions.

Only metadata, canonical links, and permitted abstracts/snippets are stored.
Full copyrighted papers are not republished.

## Staging validation
Synthetic test:
- same DOI saved twice → 1 canonical source
- project source links → 1
- SUPPORTS relationship → claim became SUPPORTED
- second CHALLENGES relationship → claim became MIXED
- EVIDENCE_SOURCE_SAVED Timeline event generated
- cross-tenant user B visible claims: 0
- cross-tenant visible project sources: 0
- cross-tenant visible claim links: 0

Synthetic test data was deleted.

## Supabase advisors
Security Advisor after Evidence migrations:
- zero findings

Performance advisor:
- no missing FK indexes after remediation
- remaining unused-index notices are expected on a new staging database

## API routes
- POST /api/v1/projects/:id/evidence/search
- POST /api/v1/projects/:id/evidence/save
- POST /api/v1/projects/:id/claims

## Release notes
OpenAlex basic access can work without a key, but production should use a project API key for predictable quota.
Crossref polite usage should configure CROSSREF_MAILTO.
