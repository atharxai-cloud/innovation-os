-- Innovation OS
-- Migration 012: Evidence save and claim workflow

create or replace function public.save_evidence_source(
  p_project_id uuid,
  p_source jsonb,
  p_relevance text default null,
  p_notes text default null,
  p_claim_id uuid default null,
  p_relationship text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
  v_source_id uuid;
  v_external_id text := nullif(trim(p_source ->> 'external_id'), '');
  v_doi text := nullif(lower(trim(p_source ->> 'doi')), '');
  v_title text := nullif(trim(p_source ->> 'title'), '');
  v_url text := nullif(trim(p_source ->> 'url'), '');
  v_source_type text := coalesce(nullif(trim(p_source ->> 'source_type'), ''), 'RESEARCH_PAPER');
  v_published_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select p.workspace_id into v_workspace_id
  from public.projects p
  where p.id = p_project_id and app_private.can_edit_project(p.id);

  if v_workspace_id is null then raise exception 'project not found or inaccessible'; end if;
  if v_title is null or v_url is null then raise exception 'source title and url are required'; end if;

  begin
    v_published_at := nullif(p_source ->> 'published_at', '')::timestamptz;
  exception when others then
    v_published_at := null;
  end;

  if v_doi is not null then
    select s.id into v_source_id
    from public.sources s
    where s.workspace_id = v_workspace_id and lower(s.doi) = v_doi limit 1;
  end if;

  if v_source_id is null and v_external_id is not null then
    select s.id into v_source_id
    from public.sources s
    where s.workspace_id = v_workspace_id
      and s.source_type = v_source_type
      and s.external_id = v_external_id
    limit 1;
  end if;

  if v_source_id is null then
    insert into public.sources (
      workspace_id, source_type, external_id, doi, title,
      authors_json, published_at, url, metadata_json
    ) values (
      v_workspace_id, v_source_type, v_external_id, v_doi, v_title,
      coalesce(p_source -> 'authors', '[]'::jsonb), v_published_at, v_url,
      coalesce(p_source -> 'metadata', '{}'::jsonb)
    ) returning id into v_source_id;
  end if;

  insert into public.project_sources (
    project_id, source_id, relevance, notes, saved_by
  ) values (
    p_project_id, v_source_id, p_relevance, p_notes, v_user_id
  )
  on conflict (project_id, source_id)
  do update set
    relevance = coalesce(excluded.relevance, public.project_sources.relevance),
    notes = coalesce(excluded.notes, public.project_sources.notes);

  if p_claim_id is not null then
    if not exists (
      select 1 from public.claims c
      where c.id = p_claim_id
        and c.project_id = p_project_id
        and app_private.can_edit_project(c.project_id)
    ) then
      raise exception 'claim not found or inaccessible';
    end if;

    if p_relationship not in ('SUPPORTS','CHALLENGES','CONTEXT') then
      raise exception 'invalid claim-source relationship';
    end if;

    insert into public.claim_sources (claim_id, source_id, relationship, notes)
    values (p_claim_id, v_source_id, p_relationship, p_notes)
    on conflict (claim_id, source_id, relationship)
    do update set notes = coalesce(excluded.notes, public.claim_sources.notes);
  end if;

  return v_source_id;
end;
$$;

revoke all on function public.save_evidence_source(uuid,jsonb,text,text,uuid,text) from public, anon;
grant execute on function public.save_evidence_source(uuid,jsonb,text,text,uuid,text) to authenticated, service_role;

create or replace function app_private.project_source_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
begin
  select p.workspace_id into v_workspace_id
  from public.projects p where p.id = new.project_id;

  update public.projects set updated_at = now() where id = new.project_id;

  insert into public.audit_events (
    workspace_id, project_id, actor_id, event_type,
    entity_type, entity_id, metadata_json
  ) values (
    v_workspace_id, new.project_id, new.saved_by,
    'EVIDENCE_SOURCE_SAVED', 'SOURCE', new.source_id,
    jsonb_build_object('relevance', new.relevance)
  );

  return new;
end;
$$;

revoke all on function app_private.project_source_changed() from public, anon, authenticated;
grant execute on function app_private.project_source_changed() to service_role;

drop trigger if exists project_sources_brain_dirty on public.project_sources;
create trigger project_sources_brain_dirty
after insert on public.project_sources
for each row execute function app_private.project_source_changed();

create or replace function public.create_claim(
  p_project_id uuid,
  p_statement text,
  p_claim_type text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare v_claim_id uuid;
begin
  if not app_private.can_edit_project(p_project_id) then
    raise exception 'project not found or inaccessible';
  end if;

  insert into public.claims (project_id, statement, claim_type, status)
  values (p_project_id, trim(p_statement), p_claim_type, 'UNSUPPORTED')
  returning id into v_claim_id;

  return v_claim_id;
end;
$$;

revoke all on function public.create_claim(uuid,text,text) from public, anon;
grant execute on function public.create_claim(uuid,text,text) to authenticated, service_role;
