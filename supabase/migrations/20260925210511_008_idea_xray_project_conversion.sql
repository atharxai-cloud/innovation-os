-- Innovation OS
-- Migration 008: Convert Idea X-Ray structured output to Project State

create or replace function public.create_project_from_idea_xray(
  p_slug text,
  p_analysis jsonb
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
  v_title text := nullif(trim(p_analysis ->> 'project_title'), '');
  v_problem text := nullif(trim(p_analysis ->> 'problem'), '');
  v_context text := nullif(trim(p_analysis ->> 'context'), '');
  v_affected text := nullif(trim(p_analysis ->> 'affected_users'), '');
  v_direction text := nullif(trim(p_analysis ->> 'proposed_direction'), '');
  v_item text;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if v_title is null or char_length(v_title) > 180 then
    raise exception 'invalid project title';
  end if;

  if v_problem is null or char_length(v_problem) < 10 then
    raise exception 'invalid problem statement';
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
    v_workspace_id, v_user_id, v_title, p_slug, v_problem,
    'DISCOVERY', 'ACTIVE', 'PRIVATE'
  )
  returning id into v_project_id;

  insert into public.project_problems (
    project_id, problem_statement, context, affected_users,
    current_solution_direction, status
  ) values (
    v_project_id, v_problem, v_context, v_affected, v_direction, 'ACTIVE'
  );

  for v_item in
    select value
    from jsonb_array_elements_text(coalesce(p_analysis -> 'assumptions', '[]'::jsonb))
    limit 12
  loop
    if char_length(trim(v_item)) between 3 and 500 then
      insert into public.project_assumptions (project_id, category, statement, status)
      values (v_project_id, 'IDEA_XRAY', trim(v_item), 'UNTESTED');
    end if;
  end loop;

  for v_item in
    select value
    from jsonb_array_elements_text(coalesce(p_analysis -> 'critical_questions', '[]'::jsonb))
    limit 12
  loop
    if char_length(trim(v_item)) between 3 and 500 then
      insert into public.project_questions (project_id, question, type, priority, status)
      values (v_project_id, trim(v_item), 'PROBLEM_VALIDATION', 1, 'OPEN');
    end if;
  end loop;

  for v_item in
    select value
    from jsonb_array_elements_text(coalesce(p_analysis -> 'unknowns', '[]'::jsonb))
    limit 12
  loop
    if char_length(trim(v_item)) between 3 and 500 then
      insert into public.project_questions (project_id, question, type, priority, status)
      values (v_project_id, trim(v_item), 'UNKNOWN', 2, 'OPEN');
    end if;
  end loop;

  return v_project_id;
end;
$$;

revoke all on function public.create_project_from_idea_xray(text,jsonb)
  from public, anon;
grant execute on function public.create_project_from_idea_xray(text,jsonb)
  to authenticated, service_role;
