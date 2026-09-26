-- Innovation OS
-- Migration 017: Experiment Designer + Scientific Critic

create table if not exists public.experiments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  gap_id uuid references public.gaps(id) on delete set null,
  title text not null check (char_length(title) between 3 and 240),
  research_question text not null check (char_length(research_question) between 10 and 1500),
  hypothesis text not null check (char_length(hypothesis) between 10 and 1500),
  independent_variable text,
  dependent_variable text,
  control_description text,
  sample_description text,
  measurement_method text,
  protocol_json jsonb not null default '[]'::jsonb,
  success_criteria text,
  expected_failure_modes_json jsonb not null default '[]'::jsonb,
  safety_notes_json jsonb not null default '[]'::jsonb,
  status text not null default 'DRAFT'
    check (status in ('DRAFT','AI_REVIEWED','NEEDS_REVISION','READY','ARCHIVED')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists experiments_project_status_idx on public.experiments(project_id, status);
create index if not exists experiments_gap_idx on public.experiments(gap_id);
create index if not exists experiments_created_by_idx on public.experiments(created_by);

create table if not exists public.experiment_reviews (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.experiments(id) on delete cascade,
  review_type text not null default 'SCIENTIFIC_CRITIC'
    check (review_type in ('SCIENTIFIC_CRITIC')),
  issues_json jsonb not null default '[]'::jsonb,
  recommendations_json jsonb not null default '[]'::jsonb,
  blocking_issues_json jsonb not null default '[]'::jsonb,
  reviewed_at timestamptz not null default now(),
  model_metadata_json jsonb not null default '{}'::jsonb
);

create index if not exists experiment_reviews_experiment_reviewed_idx
  on public.experiment_reviews(experiment_id, reviewed_at desc);

create trigger experiments_set_updated_at
before update on public.experiments
for each row execute function app_private.set_updated_at();

alter table public.experiments enable row level security;
alter table public.experiment_reviews enable row level security;

create policy experiments_select on public.experiments for select to authenticated
using (app_private.can_read_project(project_id));

create policy experiments_insert on public.experiments for insert to authenticated
with check (
  app_private.can_edit_project(project_id)
  and created_by = (select auth.uid())
  and (
    gap_id is null
    or exists (
      select 1 from public.gaps g
      where g.id = gap_id
        and g.project_id = project_id
        and g.status <> 'REJECTED'
    )
  )
);

create policy experiments_update on public.experiments for update to authenticated
using (app_private.can_edit_project(project_id))
with check (app_private.can_edit_project(project_id));

create policy experiment_reviews_select
on public.experiment_reviews for select to authenticated
using (
  exists (
    select 1 from public.experiments e
    where e.id = experiment_id
      and app_private.can_read_project(e.project_id)
  )
);

revoke all on table public.experiments from anon, authenticated;
revoke all on table public.experiment_reviews from anon, authenticated;

grant select, insert on table public.experiments to authenticated;
grant update (
  title,
  research_question,
  hypothesis,
  independent_variable,
  dependent_variable,
  control_description,
  sample_description,
  measurement_method,
  protocol_json,
  success_criteria,
  expected_failure_modes_json,
  safety_notes_json
) on table public.experiments to authenticated;
grant select on table public.experiment_reviews to authenticated;

grant all on table public.experiments to service_role;
grant all on table public.experiment_reviews to service_role;

create or replace function public.save_experiment_draft(
  p_project_id uuid,
  p_gap_id uuid,
  p_experiment jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_experiment_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if not app_private.can_edit_project(p_project_id) then
    raise exception 'project not found or inaccessible';
  end if;

  if p_gap_id is not null and not exists (
    select 1 from public.gaps g
    where g.id = p_gap_id
      and g.project_id = p_project_id
      and g.status <> 'REJECTED'
  ) then
    raise exception 'gap not found or inaccessible';
  end if;

  insert into public.experiments (
    project_id, gap_id, title, research_question, hypothesis,
    independent_variable, dependent_variable, control_description,
    sample_description, measurement_method, protocol_json,
    success_criteria, expected_failure_modes_json, safety_notes_json,
    status, created_by
  ) values (
    p_project_id,
    p_gap_id,
    trim(p_experiment ->> 'title'),
    trim(p_experiment ->> 'research_question'),
    trim(p_experiment ->> 'hypothesis'),
    nullif(trim(p_experiment ->> 'independent_variable'), ''),
    nullif(trim(p_experiment ->> 'dependent_variable'), ''),
    nullif(trim(p_experiment ->> 'control_description'), ''),
    nullif(trim(p_experiment ->> 'sample_description'), ''),
    nullif(trim(p_experiment ->> 'measurement_method'), ''),
    coalesce(p_experiment -> 'protocol', '[]'::jsonb),
    nullif(trim(p_experiment ->> 'success_criteria'), ''),
    coalesce(p_experiment -> 'expected_failure_modes', '[]'::jsonb),
    coalesce(p_experiment -> 'safety_notes', '[]'::jsonb),
    'DRAFT',
    v_user_id
  )
  returning id into v_experiment_id;

  return v_experiment_id;
end;
$$;

revoke all on function public.save_experiment_draft(uuid,uuid,jsonb) from public, anon;
grant execute on function public.save_experiment_draft(uuid,uuid,jsonb)
  to authenticated, service_role;

create or replace function app_private.mark_experiment_ready_internal(
  p_experiment_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_blockers integer;
begin
  select e.project_id into v_project_id
  from public.experiments e
  where e.id = p_experiment_id;

  if v_project_id is null or not app_private.can_edit_project(v_project_id) then
    raise exception 'experiment not found or inaccessible';
  end if;

  select jsonb_array_length(er.blocking_issues_json)
    into v_blockers
  from public.experiment_reviews er
  where er.experiment_id = p_experiment_id
  order by er.reviewed_at desc
  limit 1;

  if v_blockers is null then
    raise exception 'scientific critic review required';
  end if;

  if v_blockers > 0 then
    raise exception 'blocking issues must be resolved before READY';
  end if;

  update public.experiments
  set status = 'READY'
  where id = p_experiment_id;
end;
$$;

revoke all on function app_private.mark_experiment_ready_internal(uuid)
  from public, anon, authenticated;
grant execute on function app_private.mark_experiment_ready_internal(uuid)
  to authenticated, service_role;

create or replace function public.mark_experiment_ready(p_experiment_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform app_private.mark_experiment_ready_internal(p_experiment_id);
  return 'READY';
end;
$$;

revoke all on function public.mark_experiment_ready(uuid) from public, anon;
grant execute on function public.mark_experiment_ready(uuid)
  to authenticated, service_role;

create or replace function app_private.experiment_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
begin
  select p.workspace_id into v_workspace_id
  from public.projects p
  where p.id = new.project_id;

  update public.projects set updated_at = now() where id = new.project_id;

  if tg_op = 'INSERT' then
    insert into public.audit_events (
      workspace_id, project_id, actor_id,
      event_type, entity_type, entity_id, metadata_json
    ) values (
      v_workspace_id, new.project_id, new.created_by,
      'EXPERIMENT_CREATED', 'EXPERIMENT', new.id,
      jsonb_build_object('status', new.status, 'gap_id', new.gap_id)
    );
  end if;

  return new;
end;
$$;

revoke all on function app_private.experiment_changed() from public, anon, authenticated;
grant execute on function app_private.experiment_changed() to service_role;

create trigger experiments_brain_dirty
after insert or update on public.experiments
for each row execute function app_private.experiment_changed();

create or replace function app_private.experiment_review_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_workspace_id uuid;
  v_actor_id uuid;
  v_blocker_count integer;
begin
  select e.project_id, p.workspace_id, e.created_by
    into v_project_id, v_workspace_id, v_actor_id
  from public.experiments e
  join public.projects p on p.id = e.project_id
  where e.id = new.experiment_id;

  v_blocker_count := jsonb_array_length(new.blocking_issues_json);

  update public.experiments
  set status = case
    when v_blocker_count > 0 then 'NEEDS_REVISION'
    else 'AI_REVIEWED'
  end
  where id = new.experiment_id;

  insert into public.audit_events (
    workspace_id, project_id, actor_id,
    event_type, entity_type, entity_id, metadata_json
  ) values (
    v_workspace_id, v_project_id, v_actor_id,
    'EXPERIMENT_REVIEWED', 'EXPERIMENT_REVIEW', new.id,
    jsonb_build_object(
      'blocking_issues', v_blocker_count,
      'review_type', new.review_type
    )
  );

  return new;
end;
$$;

revoke all on function app_private.experiment_review_changed()
  from public, anon, authenticated;
grant execute on function app_private.experiment_review_changed()
  to service_role;

create trigger experiment_reviews_apply_status
after insert on public.experiment_reviews
for each row execute function app_private.experiment_review_changed();
