-- Innovation OS
-- Migration 024: Durable background jobs with Supabase Queues / PGMQ

create extension if not exists pgmq;

do $$
begin
  if not exists (
    select 1 from pgmq.list_queues() q where q.queue_name = 'innovation_jobs'
  ) then
    perform pgmq.create('innovation_jobs');
  end if;
end
$$;

create table if not exists public.background_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  job_type text not null check (job_type in ('EVIDENCE_SEARCH','PRIOR_ART_SEARCH')),
  status text not null default 'QUEUED'
    check (status in ('QUEUED','RUNNING','SUCCEEDED','FAILED','CANCELLED')),
  payload_json jsonb not null default '{}'::jsonb,
  result_json jsonb,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists background_jobs_project_created_idx
  on public.background_jobs(project_id, created_at desc);

create index if not exists background_jobs_status_created_idx
  on public.background_jobs(status, created_at);

alter table public.background_jobs enable row level security;

drop policy if exists background_jobs_select on public.background_jobs;
create policy background_jobs_select
on public.background_jobs for select
to authenticated
using (
  app_private.is_workspace_member(workspace_id)
  and app_private.can_read_project(project_id)
);

revoke all on table public.background_jobs from public, anon, authenticated;
grant select on table public.background_jobs to authenticated;
grant all on table public.background_jobs to service_role;

create or replace function public.enqueue_background_job(
  p_workspace_id uuid,
  p_project_id uuid,
  p_created_by uuid,
  p_job_type text,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job_id uuid;
begin
  if p_job_type not in ('EVIDENCE_SEARCH','PRIOR_ART_SEARCH') then
    raise exception 'unsupported job type';
  end if;

  if not exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.workspace_id = p_workspace_id
      and (
        p.owner_id = p_created_by
        or exists (
          select 1 from public.project_members pm
          where pm.project_id = p.id and pm.user_id = p_created_by
        )
        or exists (
          select 1 from public.workspace_members wm
          where wm.workspace_id = p.workspace_id and wm.user_id = p_created_by
        )
      )
  ) then
    raise exception 'job project authorization failed';
  end if;

  insert into public.background_jobs (
    workspace_id, project_id, created_by, job_type, payload_json
  ) values (
    p_workspace_id, p_project_id, p_created_by, p_job_type, coalesce(p_payload, '{}'::jsonb)
  )
  returning id into v_job_id;

  perform pgmq.send(
    'innovation_jobs',
    jsonb_build_object('job_id', v_job_id)
  );

  return v_job_id;
end;
$$;

revoke all on function public.enqueue_background_job(uuid,uuid,uuid,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.enqueue_background_job(uuid,uuid,uuid,text,jsonb)
  to service_role;

create or replace function public.claim_background_jobs(p_limit integer default 5)
returns table(
  msg_id bigint,
  job_id uuid,
  workspace_id uuid,
  project_id uuid,
  created_by uuid,
  job_type text,
  payload_json jsonb,
  attempt_count integer,
  max_attempts integer
)
language sql
security definer
set search_path = ''
as $$
  with messages as (
    select * from pgmq.read('innovation_jobs', 120, greatest(1, least(p_limit, 20)))
  ),
  claimed as (
    update public.background_jobs j
    set status = 'RUNNING',
        attempt_count = j.attempt_count + 1,
        started_at = coalesce(j.started_at, now()),
        updated_at = now()
    from messages m
    where j.id = (m.message->>'job_id')::uuid
      and j.status in ('QUEUED','RUNNING')
    returning
      m.msg_id,
      j.id as job_id,
      j.workspace_id,
      j.project_id,
      j.created_by,
      j.job_type,
      j.payload_json,
      j.attempt_count,
      j.max_attempts
  )
  select * from claimed;
$$;

revoke all on function public.claim_background_jobs(integer)
  from public, anon, authenticated;
grant execute on function public.claim_background_jobs(integer)
  to service_role;

create or replace function public.complete_background_job(
  p_job_id uuid,
  p_msg_id bigint,
  p_result jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.background_jobs
  set status = 'SUCCEEDED',
      result_json = coalesce(p_result, '{}'::jsonb),
      error_code = null,
      error_message = null,
      completed_at = now(),
      updated_at = now()
  where id = p_job_id;

  perform pgmq.archive('innovation_jobs', p_msg_id);
  return found;
end;
$$;

revoke all on function public.complete_background_job(uuid,bigint,jsonb)
  from public, anon, authenticated;
grant execute on function public.complete_background_job(uuid,bigint,jsonb)
  to service_role;

create or replace function public.fail_background_job(
  p_job_id uuid,
  p_msg_id bigint,
  p_error_code text,
  p_error_message text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempts integer;
  v_max integer;
begin
  select attempt_count, max_attempts
    into v_attempts, v_max
  from public.background_jobs
  where id = p_job_id
  for update;

  if not found then
    perform pgmq.archive('innovation_jobs', p_msg_id);
    return 'MISSING';
  end if;

  if v_attempts >= v_max then
    update public.background_jobs
    set status = 'FAILED',
        error_code = left(coalesce(p_error_code,'JOB_FAILED'), 120),
        error_message = left(coalesce(p_error_message,'background job failed'), 1000),
        completed_at = now(),
        updated_at = now()
    where id = p_job_id;

    perform pgmq.archive('innovation_jobs', p_msg_id);
    return 'FAILED';
  end if;

  update public.background_jobs
  set status = 'QUEUED',
      error_code = left(coalesce(p_error_code,'JOB_RETRY'), 120),
      error_message = left(coalesce(p_error_message,'background job retry scheduled'), 1000),
      updated_at = now()
  where id = p_job_id;

  perform pgmq.set_vt('innovation_jobs', p_msg_id, 30);
  return 'RETRY';
end;
$$;

revoke all on function public.fail_background_job(uuid,bigint,text,text)
  from public, anon, authenticated;
grant execute on function public.fail_background_job(uuid,bigint,text,text)
  to service_role;
