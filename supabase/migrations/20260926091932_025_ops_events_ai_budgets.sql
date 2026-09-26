-- Innovation OS
-- Migration 025: Operational events and AI budgets

create table if not exists public.operational_events (
  id uuid primary key default gen_random_uuid(),
  severity text not null check (severity in ('INFO','WARNING','ERROR','CRITICAL')),
  event_type text not null,
  source text not null,
  workspace_id uuid references public.workspaces(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  request_id text,
  message text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists operational_events_occurred_idx
  on public.operational_events(occurred_at desc);

create index if not exists operational_events_severity_occurred_idx
  on public.operational_events(severity, occurred_at desc);

create index if not exists operational_events_project_occurred_idx
  on public.operational_events(project_id, occurred_at desc)
  where project_id is not null;

alter table public.operational_events enable row level security;

drop policy if exists operational_events_deny_all on public.operational_events;
create policy operational_events_deny_all
on public.operational_events
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

revoke all on table public.operational_events from public, anon, authenticated;
grant all on table public.operational_events to service_role;

create table if not exists public.workspace_ai_budgets (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  monthly_limit_usd numeric(12,4) not null default 25 check (monthly_limit_usd > 0),
  warning_ratio numeric(5,4) not null default 0.8
    check (warning_ratio > 0 and warning_ratio < 1),
  hard_stop boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.workspace_ai_budgets enable row level security;

drop policy if exists workspace_ai_budgets_deny_all on public.workspace_ai_budgets;
create policy workspace_ai_budgets_deny_all
on public.workspace_ai_budgets
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

revoke all on table public.workspace_ai_budgets from public, anon, authenticated;
grant all on table public.workspace_ai_budgets to service_role;

create or replace function public.get_workspace_ai_budget_status(p_workspace_id uuid)
returns table(
  spend_usd numeric,
  limit_usd numeric,
  warning_ratio numeric,
  hard_stop boolean,
  allowed boolean
)
language sql
security definer
set search_path = ''
as $$
  with budget as (
    select
      coalesce(b.monthly_limit_usd, 25::numeric) as limit_usd,
      coalesce(b.warning_ratio, 0.8::numeric) as warning_ratio,
      coalesce(b.hard_stop, true) as hard_stop
    from (select 1) x
    left join public.workspace_ai_budgets b
      on b.workspace_id = p_workspace_id
  ),
  spend as (
    select coalesce(sum(r.estimated_cost),0)::numeric as spend_usd
    from public.ai_runs r
    where r.workspace_id = p_workspace_id
      and r.status = 'SUCCEEDED'
      and r.started_at >= date_trunc('month', now())
  )
  select
    s.spend_usd,
    b.limit_usd,
    b.warning_ratio,
    b.hard_stop,
    case
      when b.hard_stop then s.spend_usd < b.limit_usd
      else true
    end as allowed
  from spend s cross join budget b;
$$;

revoke all on function public.get_workspace_ai_budget_status(uuid)
  from public, anon, authenticated;
grant execute on function public.get_workspace_ai_budget_status(uuid)
  to service_role;

create or replace function public.get_pre_auth_ai_daily_spend()
returns numeric
language sql
security definer
set search_path = ''
as $$
  select coalesce(sum(r.estimated_cost),0)::numeric
  from public.ai_pre_auth_runs r
  where r.status = 'SUCCEEDED'
    and r.started_at >= date_trunc('day', now());
$$;

revoke all on function public.get_pre_auth_ai_daily_spend()
  from public, anon, authenticated;
grant execute on function public.get_pre_auth_ai_daily_spend()
  to service_role;
