-- Innovation OS
-- Migration 006: Enforce project state machine and audit transitions

create or replace function app_private.log_project_state_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.current_stage is distinct from new.current_stage then
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
      auth.uid(),
      'PROJECT_STAGE_CHANGED',
      'PROJECT',
      new.id,
      jsonb_build_object(
        'from', old.current_stage,
        'to', new.current_stage
      )
    );
  end if;

  if old.status is distinct from new.status then
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
      auth.uid(),
      case when new.status = 'ARCHIVED'
        then 'PROJECT_ARCHIVED'
        else 'PROJECT_STATUS_CHANGED'
      end,
      'PROJECT',
      new.id,
      jsonb_build_object(
        'from', old.status,
        'to', new.status
      )
    );
  end if;

  return new;
end;
$$;

revoke all on function app_private.log_project_state_changes()
  from public, anon, authenticated;
grant execute on function app_private.log_project_state_changes()
  to service_role;

drop trigger if exists projects_log_state_changes on public.projects;
create trigger projects_log_state_changes
after update of current_stage, status on public.projects
for each row execute function app_private.log_project_state_changes();

create or replace function public.transition_project_stage(
  p_project_id uuid,
  p_target_stage text
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current_stage text;
  v_allowed_target text;
begin
  select p.current_stage
  into v_current_stage
  from public.projects p
  where p.id = p_project_id
  for update;

  if v_current_stage is null then
    raise exception 'project not found or inaccessible';
  end if;

  v_allowed_target := case v_current_stage
    when 'DISCOVERY' then 'PROBLEM_VALIDATION'
    when 'PROBLEM_VALIDATION' then 'EVIDENCE'
    when 'EVIDENCE' then 'PRIOR_ART'
    when 'PRIOR_ART' then 'GAP_DEFINITION'
    when 'GAP_DEFINITION' then 'EXPERIMENT_DESIGN'
    when 'EXPERIMENT_DESIGN' then 'EXPERIMENT_READY'
    else null
  end;

  if v_allowed_target is null then
    raise exception 'project is already at terminal MVP stage';
  end if;

  if p_target_stage <> v_allowed_target then
    raise exception 'invalid stage transition from % to %', v_current_stage, p_target_stage;
  end if;

  update public.projects
  set current_stage = p_target_stage
  where id = p_project_id;

  return p_target_stage;
end;
$$;

revoke all on function public.transition_project_stage(uuid,text)
  from public, anon;
grant execute on function public.transition_project_stage(uuid,text)
  to authenticated, service_role;
