-- Innovation OS
-- Migration 007: AI runs and artifacts

create table if not exists public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  agent_type text not null,
  status text not null check (status in ('PENDING','RUNNING','SUCCEEDED','FAILED','CANCELLED')),
  input_hash text not null,
  model_provider text not null,
  model_name text not null,
  tokens_in bigint,
  tokens_out bigint,
  estimated_cost numeric(14,6),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_code text
);

create table if not exists public.ai_artifacts (
  id uuid primary key default gen_random_uuid(),
  ai_run_id uuid not null references public.ai_runs(id) on delete cascade,
  artifact_type text not null,
  content_json jsonb not null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  unique(ai_run_id, artifact_type, version)
);

create index if not exists ai_runs_workspace_started_idx
  on public.ai_runs(workspace_id, started_at desc);

create index if not exists ai_runs_project_started_idx
  on public.ai_runs(project_id, started_at desc)
  where project_id is not null;

create index if not exists ai_artifacts_run_idx
  on public.ai_artifacts(ai_run_id);

alter table public.ai_runs enable row level security;
alter table public.ai_artifacts enable row level security;

create policy ai_runs_select
on public.ai_runs for select
to authenticated
using (
  app_private.is_workspace_member(workspace_id)
  and (project_id is null or app_private.can_read_project(project_id))
);

create policy ai_artifacts_select
on public.ai_artifacts for select
to authenticated
using (
  exists (
    select 1
    from public.ai_runs r
    where r.id = ai_run_id
      and app_private.is_workspace_member(r.workspace_id)
      and (r.project_id is null or app_private.can_read_project(r.project_id))
  )
);

revoke all on table public.ai_runs from anon, authenticated;
revoke all on table public.ai_artifacts from anon, authenticated;

grant select on table public.ai_runs to authenticated;
grant select on table public.ai_artifacts to authenticated;

grant all on table public.ai_runs to service_role;
grant all on table public.ai_artifacts to service_role;
