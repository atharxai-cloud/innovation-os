-- Innovation OS
-- Migration 011: Evidence Engine core

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_type text not null check (source_type in ('RESEARCH_PAPER','PATENT','WEB','PRODUCT','OTHER')),
  external_id text,
  doi text,
  title text not null,
  authors_json jsonb not null default '[]'::jsonb,
  published_at timestamptz,
  url text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists sources_workspace_external_uidx
  on public.sources(workspace_id, source_type, external_id)
  where external_id is not null;

create unique index if not exists sources_workspace_doi_uidx
  on public.sources(workspace_id, lower(doi))
  where doi is not null;

create index if not exists sources_workspace_created_idx
  on public.sources(workspace_id, created_at desc);

create table if not exists public.project_sources (
  project_id uuid not null references public.projects(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  relevance text,
  notes text,
  saved_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (project_id, source_id)
);

create index if not exists project_sources_source_idx
  on public.project_sources(source_id);

create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  statement text not null check (char_length(statement) between 5 and 1500),
  claim_type text not null check (
    claim_type in ('PROBLEM','MECHANISM','TECHNOLOGY','MEASUREMENT','SOLUTION','OTHER')
  ),
  status text not null default 'UNSUPPORTED'
    check (status in ('SUPPORTED','MIXED','UNSUPPORTED','UNKNOWN')),
  confidence numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists claims_project_status_idx
  on public.claims(project_id, status);

create table if not exists public.claim_sources (
  claim_id uuid not null references public.claims(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  relationship text not null check (relationship in ('SUPPORTS','CHALLENGES','CONTEXT')),
  notes text,
  created_at timestamptz not null default now(),
  primary key (claim_id, source_id, relationship)
);

create index if not exists claim_sources_source_idx
  on public.claim_sources(source_id);

create trigger claims_set_updated_at
before update on public.claims
for each row execute function app_private.set_updated_at();

alter table public.sources enable row level security;
alter table public.project_sources enable row level security;
alter table public.claims enable row level security;
alter table public.claim_sources enable row level security;

create policy sources_select_workspace
on public.sources for select
to authenticated
using (app_private.is_workspace_member(workspace_id));

create policy sources_insert_workspace
on public.sources for insert
to authenticated
with check (app_private.is_workspace_member(workspace_id));

create policy project_sources_select
on public.project_sources for select
to authenticated
using (
  app_private.can_read_project(project_id)
  and exists (
    select 1 from public.sources s
    where s.id = source_id
      and app_private.is_workspace_member(s.workspace_id)
  )
);

create policy project_sources_insert
on public.project_sources for insert
to authenticated
with check (
  app_private.can_edit_project(project_id)
  and saved_by = (select auth.uid())
  and exists (
    select 1 from public.sources s
    where s.id = source_id
      and app_private.is_workspace_member(s.workspace_id)
  )
);

create policy claims_select
on public.claims for select
to authenticated
using (app_private.can_read_project(project_id));

create policy claims_insert
on public.claims for insert
to authenticated
with check (app_private.can_edit_project(project_id));

create policy claims_update
on public.claims for update
to authenticated
using (app_private.can_edit_project(project_id))
with check (app_private.can_edit_project(project_id));

create policy claim_sources_select
on public.claim_sources for select
to authenticated
using (
  exists (
    select 1 from public.claims c
    where c.id = claim_id
      and app_private.can_read_project(c.project_id)
  )
);

create policy claim_sources_insert
on public.claim_sources for insert
to authenticated
with check (
  exists (
    select 1 from public.claims c
    where c.id = claim_id
      and app_private.can_edit_project(c.project_id)
  )
  and exists (
    select 1 from public.sources s
    where s.id = source_id
      and app_private.is_workspace_member(s.workspace_id)
  )
);

revoke all on table public.sources from anon, authenticated;
revoke all on table public.project_sources from anon, authenticated;
revoke all on table public.claims from anon, authenticated;
revoke all on table public.claim_sources from anon, authenticated;

grant select, insert on table public.sources to authenticated;
grant select, insert on table public.project_sources to authenticated;
grant select, insert on table public.claims to authenticated;
grant update (statement, claim_type, status, confidence) on table public.claims to authenticated;
grant select, insert on table public.claim_sources to authenticated;

grant all on table public.sources to service_role;
grant all on table public.project_sources to service_role;
grant all on table public.claims to service_role;
grant all on table public.claim_sources to service_role;

create or replace function app_private.refresh_claim_status(p_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_support integer;
  v_challenge integer;
  v_total integer;
  v_status text;
begin
  select
    count(*) filter (where relationship = 'SUPPORTS'),
    count(*) filter (where relationship = 'CHALLENGES'),
    count(*)
  into v_support, v_challenge, v_total
  from public.claim_sources
  where claim_id = p_claim_id;

  v_status := case
    when v_total = 0 then 'UNSUPPORTED'
    when v_support > 0 and v_challenge > 0 then 'MIXED'
    when v_support > 0 then 'SUPPORTED'
    when v_challenge > 0 then 'MIXED'
    else 'UNKNOWN'
  end;

  update public.claims set status = v_status where id = p_claim_id;
end;
$$;

revoke all on function app_private.refresh_claim_status(uuid) from public, anon, authenticated;
grant execute on function app_private.refresh_claim_status(uuid) to service_role;

create or replace function app_private.claim_source_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.refresh_claim_status(coalesce(new.claim_id, old.claim_id));

  update public.projects
  set updated_at = now()
  where id = (
    select c.project_id from public.claims c
    where c.id = coalesce(new.claim_id, old.claim_id)
  );

  return coalesce(new, old);
end;
$$;

revoke all on function app_private.claim_source_changed() from public, anon, authenticated;
grant execute on function app_private.claim_source_changed() to service_role;

drop trigger if exists claim_sources_refresh_claim on public.claim_sources;
create trigger claim_sources_refresh_claim
after insert or update or delete on public.claim_sources
for each row execute function app_private.claim_source_changed();

create or replace function app_private.claim_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.projects set updated_at = now() where id = new.project_id;
  return new;
end;
$$;

revoke all on function app_private.claim_changed() from public, anon, authenticated;
grant execute on function app_private.claim_changed() to service_role;

drop trigger if exists claims_brain_dirty on public.claims;
create trigger claims_brain_dirty
after insert or update on public.claims
for each row execute function app_private.claim_changed();
