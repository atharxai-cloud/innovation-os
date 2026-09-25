# Epic 1 — Supabase Security Validation

## Environment
- Supabase project: innovation-os-staging
- Project ref: `tzthybwsuqufpuhooaey`
- Region: `eu-central-1`

## Applied migrations
1. `001_core_tenant_auth_foundation`
2. `002_harden_bootstrap_and_rls`
3. `003_enforce_least_privilege_grants`

## What is implemented
- profiles
- workspaces
- workspace_members
- projects
- project_members
- personal workspace auto-bootstrap on Auth user creation
- workspace-based tenant boundary
- RLS on all core public tables
- explicit Data API grants
- deny-by-default anonymous access
- immutable tenant ownership columns from client-side update paths

## Isolation test
Two synthetic authenticated users were created temporarily.

Expected and observed for User A:
- visible profiles: 1
- visible workspaces: 1
- visible projects: 1
- cross-workspace updates: 0
- own workspace updates: 1
- cross-project updates: 0
- own project updates: 1

Expected and observed for User B:
- visible profiles: 1
- visible workspaces: 1
- visible projects: 1
- visible workspace memberships: 1

The synthetic users and all associated data were deleted after the test.

## Least-privilege test
Authenticated role:
- DELETE projects: denied
- DELETE workspaces: denied
- INSERT workspace_members: denied
- UPDATE workspace_members: denied
- DELETE workspace_members: denied
- INSERT projects: allowed
- anonymous SELECT projects/workspaces: denied

## Supabase Advisor status
Security Advisor is clean for database/RLS after hardening.

One Auth-level warning remains:
- Leaked Password Protection is disabled.

This must be enabled in Supabase Auth settings before real public user onboarding.

Reference:
https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Production gate
Any future cross-workspace read/update/delete regression blocks release.
