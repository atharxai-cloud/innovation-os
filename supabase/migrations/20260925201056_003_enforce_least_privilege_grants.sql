-- Innovation OS
-- Migration 003: Least-privilege Data API grants

revoke all on table public.profiles from authenticated;
revoke all on table public.workspaces from authenticated;
revoke all on table public.workspace_members from authenticated;
revoke all on table public.projects from authenticated;
revoke all on table public.project_members from authenticated;

grant select on table public.profiles to authenticated;
grant update (display_name, preferred_language, country) on table public.profiles to authenticated;

grant select on table public.workspaces to authenticated;
grant update (name) on table public.workspaces to authenticated;

grant select on table public.workspace_members to authenticated;

grant select, insert on table public.projects to authenticated;
grant update (
  title,
  slug,
  description,
  current_stage,
  status,
  archived_at
) on table public.projects to authenticated;

grant select on table public.project_members to authenticated;

grant all on table public.profiles to service_role;
grant all on table public.workspaces to service_role;
grant all on table public.workspace_members to service_role;
grant all on table public.projects to service_role;
grant all on table public.project_members to service_role;
