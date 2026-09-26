-- Innovation OS
-- Migration 002: Harden bootstrap + RLS

drop function if exists public.bootstrap_personal_workspace();

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_display_name text;
begin
  v_display_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    ''
  );

  insert into public.profiles (id, display_name, preferred_language, country)
  values (new.id, v_display_name, 'ar', 'SA')
  on conflict (id) do nothing;

  insert into public.workspaces (name, type, owner_id)
  values ('مساحتي', 'PERSONAL', new.id)
  returning id into v_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role, status)
  values (v_workspace_id, new.id, 'OWNER', 'ACTIVE');

  return new;
end;
$$;

revoke all on function app_private.handle_new_user() from public, anon, authenticated;
grant execute on function app_private.handle_new_user() to service_role;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function app_private.handle_new_user();

drop policy if exists profiles_select_self on public.profiles;
drop policy if exists profiles_insert_self on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists workspaces_insert_owner on public.workspaces;
drop policy if exists projects_insert_member on public.projects;

create policy profiles_select_self
on public.profiles for select
to authenticated
using (id = (select auth.uid()));

create policy profiles_update_self
on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy projects_insert_member
on public.projects for insert
to authenticated
with check (
  app_private.is_workspace_member(workspace_id)
  and owner_id = (select auth.uid())
);

revoke insert, update on table public.profiles from authenticated;
revoke insert, update on table public.workspaces from authenticated;
revoke update on table public.projects from authenticated;

grant update (display_name, preferred_language, country) on table public.profiles to authenticated;
grant update (name) on table public.workspaces to authenticated;
grant update (
  title,
  slug,
  description,
  current_stage,
  status,
  archived_at
) on table public.projects to authenticated;

revoke execute on function app_private.is_workspace_member(uuid) from anon;
revoke execute on function app_private.is_workspace_admin(uuid) from anon;
revoke execute on function app_private.can_read_project(uuid) from anon;
revoke execute on function app_private.can_edit_project(uuid) from anon;
