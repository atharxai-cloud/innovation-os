# Epic 1B — Supabase Auth + SSR Integration

## Scope
This phase connects the Next.js application to the dedicated Innovation OS Supabase staging project.

## Implemented
- Pinned `@supabase/ssr` and `@supabase/supabase-js`.
- Browser and server Supabase clients.
- Next.js 16 `proxy.ts` session refresh.
- Server-side protected route layouts.
- Email/password signup and login.
- Auth callback code exchange.
- Logout.
- Personal Workspace creation remains database-triggered from `auth.users`.

## Security rules
- Publishable key only in public client configuration.
- No service-role usage in browser code.
- Protected pages verify auth claims server-side.
- Redirect destinations are restricted to same-site relative paths.
- Database RLS remains the authorization source of truth.
- Package versions are pinned and package-lock.json is committed.

## Required environment variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=
```

## Staging values
Project ref: `tzthybwsuqufpuhooaey`

Public runtime values must be configured in the deployment environment; they are not committed with secrets.

## Remaining Auth configuration gate
Enable Supabase Auth leaked-password protection before public onboarding.
