-- Innovation OS
-- Migration 001: Core tenant + auth foundation

create extension if not exists pgcrypto;

create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to authenticated, service_role;

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  preferred_language text not null default 'ar' check (preferred_language in ('ar','en')),
  country text not null default 'SA',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  type text not null check (type in ('PERSONAL','ORGANIZATION')),
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index workspaces_personal_owner_uidx
  on public.workspaces(owner_id)
  where type = 'PERSONAL';

create index workspaces_owner_idx on public.workspaces(owner_id);
create index workspaces_type_idx on public.workspaces(type);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('OWNER','ADMIN','MEMBER','VIEWER')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INVITED','SUSPENDED')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_idx on public.workspace_members(user_id);
create index workspace_members_workspace_status_idx on public.workspace_members(workspace_id, status);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 180),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  current_stage text not null default 'DISCOVERY'
    check (current_stage in (
      'DISCOVERY','PROBLEM_VALIDATION','EVIDENCE','PRIOR_ART',
      'GAP_DEFINITION','EXPERIMENT_DESIGN','EXPERIMENT_READY'
    )),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','ARCHIVED')),
  visibility text not null default 'PRIVATE' check (visibility = 'PRIVATE'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (workspace_id, slug)
);

create index projects_workspace_updated_idx on public.projects(workspace_id, updated_at desc);
create index projects_owner_idx on public.projects(owner_id);
create index projects_stage_idx on public.projects(current_stage);
create index projects_status_idx on public.projects(status);

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('OWNER','EDITOR','MENTOR','VIEWER')),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index project_members_user_idx on public.project_members(user_id);
create index project_members_project_idx on public.project_members(project_id);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function app_private.set_updated_at();

create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function app_private.set_updated_at();

create trigger projects_set_updated_at
before update on public.projects
for each row execute function app_private.set_updated_at();

create or replace function app_private.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'ACTIVE'
  );
$$;

create or replace function app_private.is_workspace_admin(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'ACTIVE'
      and wm.role in ('OWNER','ADMIN')
  );
$$;

create or replace function app_private.can_read_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and (
        app_private.is_workspace_member(p.workspace_id)
        or exists (
          select 1 from public.project_members pm
          where pm.project_id = p.id
            and pm.user_id = auth.uid()
        )
      )
  );
$$;

create or replace function app_private.can_edit_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and (
        app_private.is_workspace_admin(p.workspace_id)
        or p.owner_id = auth.uid()
        or exists (
          select 1 from public.project_members pm
          where pm.project_id = p.id
            and pm.user_id = auth.uid()
            and pm.role in ('OWNER','EDITOR')
        )
      )
  );
$$;

revoke all on function app_private.is_workspace_member(uuid) from public;
revoke all on function app_private.is_workspace_admin(uuid) from public;
revoke all on function app_private.can_read_project(uuid) from public;
revoke all on function app_private.can_edit_project(uuid) from public;

grant execute on function app_private.is_workspace_member(uuid) to authenticated, service_role;
grant execute on function app_private.is_workspace_admin(uuid) to authenticated, service_role;
grant execute on function app_private.can_read_project(uuid) to authenticated, service_role;
grant execute on function app_private.can_edit_project(uuid) to authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;

create policy profiles_select_self
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy profiles_insert_self
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy profiles_update_self
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy workspaces_select_member
on public.workspaces for select
to authenticated
using (app_private.is_workspace_member(id));

create policy workspaces_insert_owner
on public.workspaces for insert
to authenticated
with check (owner_id = auth.uid());

create policy workspaces_update_admin
on public.workspaces for update
to authenticated
using (app_private.is_workspace_admin(id))
with check (app_private.is_workspace_admin(id));

create policy workspace_members_select_member
on public.workspace_members for select
to authenticated
using (app_private.is_workspace_member(workspace_id));

create policy projects_select_member
on public.projects for select
to authenticated
using (
  app_private.is_workspace_member(workspace_id)
  or app_private.can_read_project(id)
);

create policy projects_insert_member
on public.projects for insert
to authenticated
with check (
  app_private.is_workspace_member(workspace_id)
  and owner_id = auth.uid()
);

create policy projects_update_editor
on public.projects for update
to authenticated
using (app_private.can_edit_project(id))
with check (
  app_private.can_edit_project(id)
  and app_private.is_workspace_member(workspace_id)
);

create policy project_members_select_project_reader
on public.project_members for select
to authenticated
using (app_private.can_read_project(project_id));

create or replace function public.bootstrap_personal_workspace()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
  v_display_name text;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  v_display_name := coalesce(
    auth.jwt() -> 'user_metadata' ->> 'full_name',
    auth.jwt() -> 'user_metadata' ->> 'name',
    ''
  );

  insert into public.profiles (id, display_name, preferred_language, country)
  values (v_user_id, v_display_name, 'ar', 'SA')
  on conflict (id) do nothing;

  select w.id
    into v_workspace_id
  from public.workspaces w
  where w.owner_id = v_user_id
    and w.type = 'PERSONAL'
  limit 1;

  if v_workspace_id is null then
    insert into public.workspaces (name, type, owner_id)
    values ('مساحتي', 'PERSONAL', v_user_id)
    returning id into v_workspace_id;
  end if;

  insert into public.workspace_members (workspace_id, user_id, role, status)
  values (v_workspace_id, v_user_id, 'OWNER', 'ACTIVE')
  on conflict (workspace_id, user_id)
  do update set role = 'OWNER', status = 'ACTIVE';

  return v_workspace_id;
end;
$$;

revoke all on function public.bootstrap_personal_workspace() from public;
grant execute on function public.bootstrap_personal_workspace() to authenticated, service_role;

revoke all on table public.profiles from anon;
revoke all on table public.workspaces from anon;
revoke all on table public.workspace_members from anon;
revoke all on table public.projects from anon;
revoke all on table public.project_members from anon;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.workspaces to authenticated;
grant select on table public.workspace_members to authenticated;
grant select, insert, update on table public.projects to authenticated;
grant select on table public.project_members to authenticated;

grant all on table public.profiles to service_role;
grant all on table public.workspaces to service_role;
grant all on table public.workspace_members to service_role;
grant all on table public.projects to service_role;
grant all on table public.project_members to service_role;
