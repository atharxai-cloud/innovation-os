-- Innovation OS
-- Migration 014: Evidence upsert permissions

create policy project_sources_update
on public.project_sources for update
to authenticated
using (
  app_private.can_edit_project(project_id)
  and exists (
    select 1 from public.sources s
    where s.id = source_id
      and app_private.is_workspace_member(s.workspace_id)
  )
)
with check (
  app_private.can_edit_project(project_id)
  and exists (
    select 1 from public.sources s
    where s.id = source_id
      and app_private.is_workspace_member(s.workspace_id)
  )
);

create policy claim_sources_update
on public.claim_sources for update
to authenticated
using (
  exists (
    select 1 from public.claims c
    where c.id = claim_id
      and app_private.can_edit_project(c.project_id)
  )
)
with check (
  exists (
    select 1 from public.claims c
    where c.id = claim_id
      and app_private.can_edit_project(c.project_id)
  )
);

grant update (relevance, notes) on table public.project_sources to authenticated;
grant update (notes) on table public.claim_sources to authenticated;
