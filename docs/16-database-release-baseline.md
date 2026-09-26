# Database Release Baseline — Migration Reconciliation

Date: 2026-09-26  
Environment: Supabase Staging `tzthybwsuqufpuhooaey`

## Problem

Staging schema had migrations 015–018 applied directly during feature validation, while `supabase_migrations.schema_migrations` only recorded through 014. Repository migration filenames also used short numeric prefixes instead of Supabase-compatible timestamp versions.

## Reconciliation

Repository migration filenames were normalized to the exact versions already recorded remotely for 001–014.

The verified schema for 015–018 was mapped to fixed versions:

- `20260926070751_015_prior_art_discovery.sql`
- `20260926071331_016_gap_finder.sql`
- `20260926072335_017_experiment_designer_critic.sql`
- `20260926072336_018_experiment_revision_audit.sql`

After verifying tables, constraints, triggers, functions, RLS policies, and explicit grants, those four versions were recorded as applied in Staging migration history. Their DDL was not executed again.

## Verification

- Staging migration history: 001–018 present
- RLS enabled on Prior Art, Gap, Experiment, and Review tables
- no anonymous table access for the verified domain tables
- authenticated access remains least-privilege
- Supabase Security Advisor: zero findings
- synthetic feature-validation data: absent
- migration integrity guard added to CI

## Permanent rule

All future schema changes must:

1. use a 14-digit timestamped migration filename
2. exist in Git before remote application
3. include explicit grants for public-schema Data API access when required
4. include RLS and project/workspace authorization
5. pass `npm run migration:check`
6. pass the full CI gate
7. never be applied directly to Production outside the migration path

## Remaining release gate

A fresh-environment replay of all migrations remains required before Production promotion.
