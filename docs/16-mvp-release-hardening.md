# MVP Release Hardening

## Release objective
Move Innovation OS from feature-complete staging core to a release-gated MVP.

## Durable rate limiting
The original in-memory Idea X-Ray limiter has been removed.

A PostgreSQL-backed rate limiter now protects high-cost routes:
- Idea X-Ray: 5 / 10 min
- Ask My Project: 20 / 10 min
- Evidence Search: 20 / 10 min
- Prior-Art Search: 10 / 10 min
- Gap Generation: 8 / 10 min
- Experiment Designer: 8 / 10 min
- Scientific Critic: 8 / 10 min

Privacy:
- raw client IP is never stored
- server creates a SHA-256 fingerprint from proxy IP + User-Agent
- database stores only the hash

Security:
- rate_limit_buckets has RLS
- explicit deny policy for anon/authenticated
- no client grants
- service_role only
- consume_rate_limit is SECURITY INVOKER
- the server fails closed with 503 if rate-limit infrastructure is unavailable

## Integrated RLS Release Gate
supabase/tests/001_rls_release_gate.sql validates in one transaction:
- owner can read project domain data
- User B cannot read User A project
- User B cannot read Evidence
- User B cannot read Claims
- User B cannot read Prior Art
- User B cannot read Gap
- User B cannot read Experiment
- User B cannot read Experiment Reviews
- User B cannot update User A project
- anon has no SELECT privilege on projects or sources
- authenticated has no access to rate-limit buckets

The test was executed on staging and returned:
RLS_RELEASE_GATE_PASSED

All test data is rolled back.

## Supabase Advisor
After rate-limit hardening:
- Security Advisor: zero findings

## Remaining external launch gates
These are deployment/account configuration, not missing domain code:

1. Supabase Auth
   - enable Leaked Password Protection before public onboarding.

2. Deployment secrets
   - OPENAI_API_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
   - NEXT_PUBLIC_SITE_URL

3. Provider configuration
   - OPENALEX_API_KEY recommended for predictable production quota
   - CROSSREF_MAILTO
   - EPO_OPS_CONSUMER_KEY
   - EPO_OPS_CONSUMER_SECRET for patent search

4. Deployment
   - create Vercel staging deployment
   - set environment variables
   - execute end-to-end release scenarios against deployed URL

## Core MVP functional path
IDEA
→ X-RAY
→ PROJECT
→ PROJECT BRAIN
→ EVIDENCE
→ PRIOR ART
→ GAP
→ EXPERIMENT DESIGN
→ SCIENTIFIC CRITIC
→ REVISION
→ EXPERIMENT READY
→ ASK MY PROJECT
