# Epic 0 — Foundation Decisions

## Runtime baseline
- Next.js 16.3.6 (Active LTS on 2026-09-25)
- React 19.3
- TypeScript 5.9.3 for broad tooling compatibility
- Tailwind CSS 4.3.3
- Node 22.20.x baseline
- Vitest 5.0.1
- ESLint 9.39.5 (maintenance line selected for current Next.js plugin compatibility)

## Security note
Next.js announced a scheduled security release for 2026-09-30. Before any production release, the project must upgrade from 16.3.6 to the patched Active LTS available at that time and re-run all CI/security checks.

## Dependency discipline
Direct dependencies are pinned. A package lock must be generated and committed before this foundation PR is eligible to merge. CI intentionally uses npm install until the lock exists; after the lock is committed, CI must switch to npm ci.

## Scope
This foundation contains route/app-shell skeletons and domain boundaries only. It intentionally does not create fake persistent data, Supabase tables, AI integrations, or external research calls.

## CI bootstrap
The default branch now contains the pull-request quality gate. Epic 0 must pass that gate before merge.

## Lockfile gate
The package lock is generated and committed by the temporary same-repository CI writer using Node 22.20.0 + npm 11.19.1, then the quality gate switches to npm ci.
