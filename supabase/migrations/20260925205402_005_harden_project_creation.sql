-- Innovation OS
-- Migration 005: Harden project creation

create index if not exists audit_events_actor_idx
  on public.audit_events(actor_id);

create or replace function app_private.log_project_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_events (
    workspace_id,
    project_id,
    actor_id,
    event_type,
    entity_type,
    entity_id,
    metadata_json
  ) values (
    new.workspace_id,
    new.id,
    new.owner_id,
    'PROJECT_CREATED',
    'PROJECT',
    new.id,
    jsonb_build_object('stage', new.current_stage)
  );

  return new;
end;
$$;

revoke all on function app_private.log_project_created() from public, anon, authenticated;
grant execute on function app_private.log_project_created() to service_role;

drop trigger if exists projects_log_created on public.projects;
create trigger projects_log_created
after insert on public.projects
for each row execute function app_private.log_project_created();

create or replace function public.create_innovation_project(
  p_title text,
  p_slug text,
  p_problem_statement text,
  p_context text default null,
  p_affected_users text default null
)
returns uuid
language plpgsql
security invoker
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
    workspace_id,
    owner_id,
    title,
    slug,
    description,
    current_stage,
    status,
    visibility
  ) values (
    v_workspace_id,
    v_user_id,
    p_title,
    p_slug,
    p_problem_statement,
    'DISCOVERY',
    'ACTIVE',
    'PRIVATE'
  )
  returning id into v_project_id;

  insert into public.project_problems (
    project_id,
    problem_statement,
    context,
    affected_users,
    status
  ) values (
    v_project_id,
    p_problem_statement,
    p_context,
    p_affected_users,
    'ACTIVE'
  );

  insert into public.project_questions (
    project_id,
    question,
    type,
    priority
  ) values
    (
      v_project_id,
      'هل المشكلة قابلة للقياس بوضوح؟',
      'PROBLEM_VALIDATION',
      1
    ),
    (
      v_project_id,
      'ما حجم المشكلة أو أثرها الحالي؟',
      'PROBLEM_VALIDATION',
      1
    ),
    (
      v_project_id,
      'ما الحلول أو الأساليب المستخدمة حاليًا؟',
      'PRIOR_ART',
      2
    );

  insert into public.project_assumptions (
    project_id,
    category,
    statement
  ) values
    (
      v_project_id,
      'PROBLEM',
      'المشكلة موجودة بصورة قابلة للرصد أو القياس'
    ),
    (
      v_project_id,
      'VALUE',
      'حل المشكلة سيحقق قيمة واضحة للمستفيد'
    );

  return v_project_id;
end;
$$;

revoke all on function public.create_innovation_project(text,text,text,text,text)
  from public, anon;
grant execute on function public.create_innovation_project(text,text,text,text,text)
  to authenticated, service_role;

grant insert on table public.project_problems to authenticated;
grant insert on table public.project_assumptions to authenticated;
grant insert on table public.project_questions to authenticated;
