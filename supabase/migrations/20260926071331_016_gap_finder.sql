-- Innovation OS
-- Migration 016: Gap Finder

create table if not exists public.gaps (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 240),
  description text not null check (char_length(description) between 10 and 2500),
  gap_type text not null check (
    gap_type in ('CONTEXT','COST','PERFORMANCE','INTEGRATION','ACCESSIBILITY','ENVIRONMENTAL','OTHER')
  ),
  status text not null default 'UNVALIDATED'
    check (status in ('UNVALIDATED','VALIDATING','VALIDATED','REJECTED')),
  confidence numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  assumptions_json jsonb not null default '[]'::jsonb,
  validation_questions_json jsonb not null default '[]'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gaps_project_status_idx on public.gaps(project_id, status);
create index if not exists gaps_created_by_idx on public.gaps(created_by);

create table if not exists public.gap_evidence (
  gap_id uuid not null references public.gaps(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  relationship text not null default 'SUPPORTS'
    check (relationship in ('SUPPORTS','CHALLENGES','CONTEXT')),
  primary key (gap_id, source_id, relationship)
);

create index if not exists gap_evidence_source_idx on public.gap_evidence(source_id);

create table if not exists public.gap_prior_art (
  gap_id uuid not null references public.gaps(id) on delete cascade,
  prior_art_id uuid not null references public.prior_art_items(id) on delete cascade,
  primary key (gap_id, prior_art_id)
);

create index if not exists gap_prior_art_prior_idx on public.gap_prior_art(prior_art_id);

create trigger gaps_set_updated_at
before update on public.gaps
for each row execute function app_private.set_updated_at();

alter table public.gaps enable row level security;
alter table public.gap_evidence enable row level security;
alter table public.gap_prior_art enable row level security;

create policy gaps_select on public.gaps for select to authenticated
using (app_private.can_read_project(project_id));

create policy gaps_insert on public.gaps for insert to authenticated
with check (
  app_private.can_edit_project(project_id)
  and created_by = (select auth.uid())
);

create policy gaps_update on public.gaps for update to authenticated
using (app_private.can_edit_project(project_id))
with check (app_private.can_edit_project(project_id));

create policy gap_evidence_select on public.gap_evidence for select to authenticated
using (
  exists (
    select 1 from public.gaps g
    where g.id = gap_id and app_private.can_read_project(g.project_id)
  )
);

create policy gap_evidence_insert on public.gap_evidence for insert to authenticated
with check (
  exists (
    select 1
    from public.gaps g
    join public.project_sources ps
      on ps.project_id = g.project_id
     and ps.source_id = source_id
    where g.id = gap_id
      and app_private.can_edit_project(g.project_id)
  )
);

create policy gap_prior_art_select on public.gap_prior_art for select to authenticated
using (
  exists (
    select 1 from public.gaps g
    where g.id = gap_id and app_private.can_read_project(g.project_id)
  )
);

create policy gap_prior_art_insert on public.gap_prior_art for insert to authenticated
with check (
  exists (
    select 1
    from public.gaps g
    join public.prior_art_items pai
      on pai.project_id = g.project_id
     and pai.id = prior_art_id
    where g.id = gap_id
      and app_private.can_edit_project(g.project_id)
  )
);

revoke all on table public.gaps from anon, authenticated;
revoke all on table public.gap_evidence from anon, authenticated;
revoke all on table public.gap_prior_art from anon, authenticated;

grant select, insert on table public.gaps to authenticated;
grant update (
  title, description, gap_type, status, confidence,
  assumptions_json, validation_questions_json
) on table public.gaps to authenticated;
grant select, insert on table public.gap_evidence to authenticated;
grant select, insert on table public.gap_prior_art to authenticated;

grant all on table public.gaps to service_role;
grant all on table public.gap_evidence to service_role;
grant all on table public.gap_prior_art to service_role;

create or replace function public.save_gap_hypothesis(
  p_project_id uuid,
  p_gap jsonb,
  p_source_ids uuid[],
  p_prior_art_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_gap_id uuid;
  v_source_id uuid;
  v_prior_id uuid;
  v_gap_type text := coalesce(nullif(trim(p_gap ->> 'gap_type'), ''), 'OTHER');
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if not app_private.can_edit_project(p_project_id) then
    raise exception 'project not found or inaccessible';
  end if;

  insert into public.gaps (
    project_id, title, description, gap_type, status, confidence,
    assumptions_json, validation_questions_json, created_by
  ) values (
    p_project_id,
    trim(p_gap ->> 'title'),
    trim(p_gap ->> 'description'),
    v_gap_type,
    'UNVALIDATED',
    case
      when (p_gap ->> 'confidence') ~ '^[0-9]+([.][0-9]+)?$'
      then (p_gap ->> 'confidence')::numeric
      else null
    end,
    coalesce(p_gap -> 'assumptions', '[]'::jsonb),
    coalesce(p_gap -> 'validation_questions', '[]'::jsonb),
    v_user_id
  )
  returning id into v_gap_id;

  foreach v_source_id in array coalesce(p_source_ids, array[]::uuid[])
  loop
    if exists (
      select 1 from public.project_sources ps
      where ps.project_id = p_project_id and ps.source_id = v_source_id
    ) then
      insert into public.gap_evidence(gap_id, source_id, relationship)
      values (v_gap_id, v_source_id, 'CONTEXT')
      on conflict do nothing;
    end if;
  end loop;

  foreach v_prior_id in array coalesce(p_prior_art_ids, array[]::uuid[])
  loop
    if exists (
      select 1 from public.prior_art_items pai
      where pai.project_id = p_project_id and pai.id = v_prior_id
    ) then
      insert into public.gap_prior_art(gap_id, prior_art_id)
      values (v_gap_id, v_prior_id)
      on conflict do nothing;
    end if;
  end loop;

  return v_gap_id;
end;
$$;

revoke all on function public.save_gap_hypothesis(uuid,jsonb,uuid[],uuid[])
  from public, anon;
grant execute on function public.save_gap_hypothesis(uuid,jsonb,uuid[],uuid[])
  to authenticated, service_role;

create or replace function app_private.gap_changed()
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
      workspace_id, project_id, actor_id,
      event_type, entity_type, entity_id, metadata_json
    ) values (
      v_workspace_id, new.project_id, new.created_by,
      'GAP_CREATED', 'GAP', new.id,
      jsonb_build_object('gap_type', new.gap_type, 'status', new.status)
    );
  end if;

  return new;
end;
$$;

revoke all on function app_private.gap_changed() from public, anon, authenticated;
grant execute on function app_private.gap_changed() to service_role;

create trigger gaps_brain_dirty
after insert or update on public.gaps
for each row execute function app_private.gap_changed();
