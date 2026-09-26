-- Innovation OS
-- Migration 013: Index evidence source saver

create index if not exists project_sources_saved_by_idx
  on public.project_sources(saved_by);
