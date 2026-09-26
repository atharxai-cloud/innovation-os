-- Innovation OS
-- Migration 027: Cover operational foreign keys with indexes

create index if not exists background_jobs_workspace_idx
  on public.background_jobs(workspace_id);

create index if not exists background_jobs_created_by_idx
  on public.background_jobs(created_by)
  where created_by is not null;

create index if not exists operational_events_workspace_idx
  on public.operational_events(workspace_id)
  where workspace_id is not null;

create index if not exists operational_events_actor_idx
  on public.operational_events(actor_id)
  where actor_id is not null;
