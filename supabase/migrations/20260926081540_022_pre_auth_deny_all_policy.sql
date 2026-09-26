-- Innovation OS
-- Migration 022: Explicit deny-all policy for pre-auth telemetry

drop policy if exists ai_pre_auth_runs_deny_all on public.ai_pre_auth_runs;

create policy ai_pre_auth_runs_deny_all
on public.ai_pre_auth_runs
as restrictive
for all
to anon, authenticated
using (false)
with check (false);
