-- Innovation OS
-- Migration 026: Operational alert deduplication and retention

create table if not exists public.ops_alert_state (
  alert_key text primary key,
  last_notified_at timestamptz not null default now(),
  last_payload_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.ops_alert_state enable row level security;

drop policy if exists ops_alert_state_deny_all on public.ops_alert_state;
create policy ops_alert_state_deny_all
on public.ops_alert_state
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

revoke all on table public.ops_alert_state from public, anon, authenticated;
grant all on table public.ops_alert_state to service_role;

create or replace function public.get_ai_budget_alerts()
returns table(
  workspace_id uuid,
  spend_usd numeric,
  limit_usd numeric,
  utilization_ratio numeric
)
language sql
security definer
set search_path = ''
as $$
  with spend as (
    select
      r.workspace_id,
      coalesce(sum(r.estimated_cost),0)::numeric as spend_usd
    from public.ai_runs r
    where r.status = 'SUCCEEDED'
      and r.started_at >= date_trunc('month', now())
    group by r.workspace_id
  )
  select
    s.workspace_id,
    s.spend_usd,
    coalesce(b.monthly_limit_usd,25::numeric) as limit_usd,
    case
      when coalesce(b.monthly_limit_usd,25::numeric) > 0
        then s.spend_usd / coalesce(b.monthly_limit_usd,25::numeric)
      else 1::numeric
    end as utilization_ratio
  from spend s
  left join public.workspace_ai_budgets b on b.workspace_id = s.workspace_id
  where s.spend_usd >= coalesce(b.monthly_limit_usd,25::numeric)
        * coalesce(b.warning_ratio,0.8::numeric);
$$;

revoke all on function public.get_ai_budget_alerts()
  from public, anon, authenticated;
grant execute on function public.get_ai_budget_alerts()
  to service_role;

create or replace function public.cleanup_operational_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rate bigint := 0;
  v_preauth bigint := 0;
  v_events bigint := 0;
  v_jobs bigint := 0;
begin
  delete from public.rate_limit_buckets
  where resets_at < now() - interval '1 day';
  get diagnostics v_rate = row_count;

  delete from public.ai_pre_auth_runs
  where started_at < now() - interval '7 days';
  get diagnostics v_preauth = row_count;

  delete from public.operational_events
  where occurred_at < now() - interval '30 days';
  get diagnostics v_events = row_count;

  delete from public.background_jobs
  where status in ('SUCCEEDED','FAILED','CANCELLED')
    and completed_at < now() - interval '30 days';
  get diagnostics v_jobs = row_count;

  return jsonb_build_object(
    'rate_limit_buckets', v_rate,
    'ai_pre_auth_runs', v_preauth,
    'operational_events', v_events,
    'background_jobs', v_jobs
  );
end;
$$;

revoke all on function public.cleanup_operational_data()
  from public, anon, authenticated;
grant execute on function public.cleanup_operational_data()
  to service_role;
