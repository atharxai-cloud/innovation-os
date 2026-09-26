-- Innovation OS
-- Migration 004: Project core state model

create table if not exists public.project_problems (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  problem_statement text not null,
  context text,
  affected_users text,
  current_solution_direction text,
  status text not null default 'DRAFT' check (status in ('DRAFT','ACTIVE','VALIDATED','REJECTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_assumptions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  category text not null,
  statement text not null,
  status text not null default 'UNTESTED'
    check (status in ('UNTESTED','SUPPORTED','CHALLENGED','REJECTED')),
  evidence_strength text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_questions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  question text not null,
  type text not null,
  priority smallint not null default 3 check (priority between 1 and 5),
  status text not null default 'OPEN' check (status in ('OPEN','IN_PROGRESS','RESOLVED','ARCHIVED')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.project_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  snapshot_version bigint not null,
  summary_json jsonb not null default '{}'::jsonb,
  stage text not null,
  next_best_action_json jsonb not null default '{}'::jsonb,
  risk_summary_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(project_id, snapshot_version)
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists project_assumptions_project_idx on public.project_assumptions(project_id);
create index if not exists project_questions_project_status_idx on public.project_questions(project_id, status);
create index if not exists project_snapshots_project_created_idx on public.project_snapshots(project_id, created_at desc);
create index if not exists audit_events_project_created_idx on public.audit_events(project_id, created_at desc);
create index if not exists audit_events_workspace_created_idx on public.audit_events(workspace_id, created_at desc);

create trigger project_problems_set_updated_at
before update on public.project_problems
for each row execute function app_private.set_updated_at();

create trigger project_assumptions_set_updated_at
before update on public.project_assumptions
for each row execute function app_private.set_updated_at();

alter table public.project_problems enable row level security;
alter table public.project_assumptions enable row level security;
alter table public.project_questions enable row level security;
alter table public.project_snapshots enable row level security;
alter table public.audit_events enable row level security;

create policy project_problems_select
on public.project_problems for select
to authenticated
using (app_private.can_read_project(project_id));

create policy project_problems_insert
on public.project_problems for insert
to authenticated
with check (app_private.can_edit_project(project_id));

create policy project_problems_update
on public.project_problems for update
to authenticated
using (app_private.can_edit_project(project_id))
with check (app_private.can_edit_project(project_id));

create policy project_assumptions_select
on public.project_assumptions for select
to authenticated
using (app_private.can_read_project(project_id));

create policy project_assumptions_insert
on public.project_assumptions for insert
to authenticated
with check (app_private.can_edit_project(project_id));

create policy project_assumptions_update
on public.project_assumptions for update
to authenticated
using (app_private.can_edit_project(project_id))
with check (app_private.can_edit_project(project_id));

create policy project_questions_select
on public.project_questions for select
to authenticated
using (app_private.can_read_project(project_id));

create policy project_questions_insert
on public.project_questions for insert
to authenticated
with check (app_private.can_edit_project(project_id));

create policy project_questions_update
on public.project_questions for update
to authenticated
using (app_private.can_edit_project(project_id))
with check (app_private.can_edit_project(project_id));

create policy project_snapshots_select
on public.project_snapshots for select
to authenticated
using (app_private.can_read_project(project_id));

create policy audit_events_select
on public.audit_events for select
to authenticated
using (
  app_private.is_workspace_member(workspace_id)
  and (project_id is null or app_private.can_read_project(project_id))
);

revoke all on table public.project_problems from anon, authenticated;
revoke all on table public.project_assumptions from anon, authenticated;
revoke all on table public.project_questions from anon, authenticated;
revoke all on table public.project_snapshots from anon, authenticated;
revoke all on table public.audit_events from anon, authenticated;

grant select, insert on table public.project_problems to authenticated;
grant update (problem_statement, context, affected_users, current_solution_direction, status) on table public.project_problems to authenticated;

grant select, insert on table public.project_assumptions to authenticated;
grant update (category, statement, status, evidence_strength) on table public.project_assumptions to authenticated;

grant select, insert on table public.project_questions to authenticated;
grant update (question, type, priority, status, resolved_at) on table public.project_questions to authenticated;

grant select on table public.project_snapshots to authenticated;
grant select on table public.audit_events to authenticated;

grant all on table public.project_problems to service_role;
grant all on table public.project_assumptions to service_role;
grant all on table public.project_questions to service_role;
grant all on table public.project_snapshots to service_role;
grant all on table public.audit_events to service_role;

create or replace function app_private.project_state(p_project_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'project_id', p.id,
    'current_stage', p.current_stage,
    'problem_statement', pp.problem_statement,
    'open_questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id,
        'question', q.question,
        'type', q.type,
        'priority', q.priority
      ) order by q.priority asc, q.created_at asc)
      from public.project_questions q
      where q.project_id = p.id and q.status in ('OPEN','IN_PROGRESS')
    ), '[]'::jsonb),
    'untested_assumptions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'category', a.category,
        'statement', a.statement,
        'status', a.status
      ) order by a.created_at asc)
      from public.project_assumptions a
      where a.project_id = p.id and a.status = 'UNTESTED'
    ), '[]'::jsonb)
  )
  from public.projects p
  left join public.project_problems pp on pp.project_id = p.id
  where p.id = p_project_id
    and app_private.can_read_project(p.id);
$$;

revoke all on function app_private.project_state(uuid) from public, anon;
grant execute on function app_private.project_state(uuid) to authenticated, service_role;

create or replace function public.create_innovation_project(
  p_title text,
  p_slug text,
  p_problem_statement text,
  p_context text default null,
  p_affected_users text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
  v_project_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select wm.workspace_id
  into v_workspace_id
  from public.workspace_members wm
  join public.workspaces w on w.id = wm.workspace_id
  where wm.user_id = v_user_id
    and wm.status = 'ACTIVE'
    and wm.role = 'OWNER'
    and w.type = 'PERSONAL'
  limit 1;

  if v_workspace_id is null then
    raise exception 'personal workspace not found';
  end if;

  insert into public.projects (
    workspace_id, owner_id, title, slug, description,
    current_stage, status, visibility
  ) values (
    v_workspace_id, v_user_id, p_title, p_slug, p_problem_statement,
    'DISCOVERY', 'ACTIVE', 'PRIVATE'
  )
  returning id into v_project_id;

  insert into public.project_problems (
    project_id, problem_statement, context, affected_users, status
  ) values (
    v_project_id, p_problem_statement, p_context, p_affected_users, 'ACTIVE'
  );

  insert into public.project_questions (project_id, question, type, priority)
  values
    (v_project_id, 'هل المشكلة قابلة للقياس بوضوح؟', 'PROBLEM_VALIDATION', 1),
    (v_project_id, 'ما حجم المشكلة أو أثرها الحالي؟', 'PROBLEM_VALIDATION', 1),
    (v_project_id, 'ما الحلول أو الأساليب المستخدمة حاليًا؟', 'PRIOR_ART', 2);

  insert into public.project_assumptions (project_id, category, statement)
  values
    (v_project_id, 'PROBLEM', 'المشكلة موجودة بصورة قابلة للرصد أو القياس'),
    (v_project_id, 'VALUE', 'حل المشكلة سيحقق قيمة واضحة للمستفيد');

  insert into public.audit_events (
    workspace_id, project_id, actor_id,
    event_type, entity_type, entity_id, metadata_json
  ) values (
    v_workspace_id, v_project_id, v_user_id,
    'PROJECT_CREATED', 'PROJECT', v_project_id,
    jsonb_build_object('stage','DISCOVERY')
  );

  return v_project_id;
end;
$$;

revoke all on function public.create_innovation_project(text,text,text,text,text) from public, anon;
grant execute on function public.create_innovation_project(text,text,text,text,text) to authenticated, service_role;
