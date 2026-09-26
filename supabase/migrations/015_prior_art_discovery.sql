-- Innovation OS
-- Migration 015: Prior-Art Discovery

create table if not exists public.prior_art_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  prior_art_type text not null check (prior_art_type in ('RESEARCH_PAPER','PATENT','TECHNOLOGY')),
  technical_summary text,
  similarity_level text check (similarity_level is null or similarity_level in ('LOW','MEDIUM','HIGH')),
  shared_concepts_json jsonb not null default '[]'::jsonb,
  differences_json jsonb not null default '[]'::jsonb,
  comparison_json jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(project_id, source_id)
);

create index if not exists prior_art_project_created_idx
  on public.prior_art_items(project_id, created_at desc);
create index if not exists prior_art_source_idx
  on public.prior_art_items(source_id);
create index if not exists prior_art_created_by_idx
  on public.prior_art_items(created_by);

alter table public.prior_art_items enable row level security;

create policy prior_art_select
on public.prior_art_items for select
to authenticated
using (app_private.can_read_project(project_id));

create policy prior_art_insert
on public.prior_art_items for insert
to authenticated
with check (
  app_private.can_edit_project(project_id)
  and created_by = (select auth.uid())
  and exists (
    select 1
    from public.sources s
    join public.projects p on p.id = project_id
    where s.id = source_id
      and s.workspace_id = p.workspace_id
      and app_private.is_workspace_member(s.workspace_id)
  )
);

create policy prior_art_update
on public.prior_art_items for update
to authenticated
using (app_private.can_edit_project(project_id))
with check (app_private.can_edit_project(project_id));

revoke all on table public.prior_art_items from anon, authenticated;
grant select, insert on table public.prior_art_items to authenticated;
grant update (
  technical_summary,
  similarity_level,
  shared_concepts_json,
  differences_json,
  comparison_json
) on table public.prior_art_items to authenticated;
grant all on table public.prior_art_items to service_role;

create or replace function public.save_prior_art_item(
  p_project_id uuid,
  p_source jsonb,
  p_prior_art_type text,
  p_comparison jsonb
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
  v_item_id uuid;
  v_external_id text := nullif(trim(p_source ->> 'external_id'), '');
  v_doi text := nullif(lower(trim(p_source ->> 'doi')), '');
  v_title text := nullif(trim(p_source ->> 'title'), '');
  v_url text := nullif(trim(p_source ->> 'url'), '');
  v_published_at timestamptz;
  v_source_type text;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select p.workspace_id into v_workspace_id
  from public.projects p
  where p.id = p_project_id
    and app_private.can_edit_project(p.id);

  if v_workspace_id is null then
    raise exception 'project not found or inaccessible';
  end if;

  if p_prior_art_type not in ('RESEARCH_PAPER','PATENT','TECHNOLOGY') then
    raise exception 'invalid prior art type';
  end if;

  v_source_type := case
    when p_prior_art_type = 'PATENT' then 'PATENT'
    when p_prior_art_type = 'TECHNOLOGY' then 'OTHER'
    else 'RESEARCH_PAPER'
  end;

  if v_title is null or v_url is null then
    raise exception 'source title and url are required';
  end if;

  begin
    v_published_at := nullif(p_source ->> 'published_at', '')::timestamptz;
  exception when others then
    v_published_at := null;
  end;

  if v_doi is not null then
    select s.id into v_source_id
    from public.sources s
    where s.workspace_id = v_workspace_id
      and lower(s.doi) = v_doi
    limit 1;
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
    )
    returning id into v_source_id;
  end if;

  insert into public.project_sources (
    project_id, source_id, relevance, notes, saved_by
  ) values (
    p_project_id, v_source_id, 'PRIOR_ART',
    'Saved from Prior-Art Discovery', v_user_id
  )
  on conflict (project_id, source_id) do nothing;

  insert into public.prior_art_items (
    project_id, source_id, prior_art_type, technical_summary,
    similarity_level, shared_concepts_json, differences_json,
    comparison_json, created_by
  ) values (
    p_project_id, v_source_id, p_prior_art_type,
    nullif(trim(p_comparison ->> 'technical_summary'), ''),
    nullif(trim(p_comparison ->> 'similarity_level'), ''),
    coalesce(p_comparison -> 'shared_concepts', '[]'::jsonb),
    coalesce(p_comparison -> 'key_differences', '[]'::jsonb),
    p_comparison, v_user_id
  )
  on conflict (project_id, source_id)
  do update set
    technical_summary = excluded.technical_summary,
    similarity_level = excluded.similarity_level,
    shared_concepts_json = excluded.shared_concepts_json,
    differences_json = excluded.differences_json,
    comparison_json = excluded.comparison_json
  returning id into v_item_id;

  return v_item_id;
end;
$$;

revoke all on function public.save_prior_art_item(uuid,jsonb,text,jsonb)
  from public, anon;
grant execute on function public.save_prior_art_item(uuid,jsonb,text,jsonb)
  to authenticated, service_role;

create or replace function app_private.prior_art_changed()
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
      workspace_id, project_id, actor_id, event_type,
      entity_type, entity_id, metadata_json
    ) values (
      v_workspace_id, new.project_id, new.created_by,
      'PRIOR_ART_SAVED', 'PRIOR_ART', new.id,
      jsonb_build_object(
        'type', new.prior_art_type,
        'similarity_level', new.similarity_level
      )
    );
  end if;

  return new;
end;
$$;

revoke all on function app_private.prior_art_changed()
  from public, anon, authenticated;
grant execute on function app_private.prior_art_changed()
  to service_role;

create trigger prior_art_brain_dirty
after insert or update on public.prior_art_items
for each row execute function app_private.prior_art_changed();
