-- Innovation OS
-- Migration 018: Audit experiment design revisions only

create or replace function app_private.experiment_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_design_changed boolean := false;
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
  elsif tg_op = 'UPDATE' then
    v_design_changed :=
      old.title is distinct from new.title
      or old.research_question is distinct from new.research_question
      or old.hypothesis is distinct from new.hypothesis
      or old.independent_variable is distinct from new.independent_variable
      or old.dependent_variable is distinct from new.dependent_variable
      or old.control_description is distinct from new.control_description
      or old.sample_description is distinct from new.sample_description
      or old.measurement_method is distinct from new.measurement_method
      or old.protocol_json is distinct from new.protocol_json
      or old.success_criteria is distinct from new.success_criteria
      or old.expected_failure_modes_json is distinct from new.expected_failure_modes_json
      or old.safety_notes_json is distinct from new.safety_notes_json;

    if v_design_changed then
      insert into public.audit_events (
        workspace_id, project_id, actor_id,
        event_type, entity_type, entity_id, metadata_json
      ) values (
        v_workspace_id, new.project_id, auth.uid(),
        'EXPERIMENT_REVISED', 'EXPERIMENT', new.id,
        jsonb_build_object('status', new.status)
      );
    end if;
  end if;

  return new;
end;
$$;
