-- Innovation OS
-- Migration 019: Enforce project stage transitions at the database boundary

create or replace function app_private.enforce_project_stage_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_allowed_target text;
begin
  if old.current_stage is not distinct from new.current_stage then
    return new;
  end if;

  v_allowed_target := case old.current_stage
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

  if new.current_stage <> v_allowed_target then
    raise exception 'invalid stage transition from % to %', old.current_stage, new.current_stage;
  end if;

  return new;
end;
$$;

revoke all on function app_private.enforce_project_stage_transition()
  from public, anon, authenticated;
grant execute on function app_private.enforce_project_stage_transition()
  to service_role;

drop trigger if exists projects_enforce_stage_transition on public.projects;
create trigger projects_enforce_stage_transition
before update of current_stage on public.projects
for each row execute function app_private.enforce_project_stage_transition();
