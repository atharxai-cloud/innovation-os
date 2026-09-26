-- Innovation OS
-- Release Gate: Cross-tenant RLS regression
-- Run against staging inside a transaction. Any breach raises an exception.

begin;

insert into auth.users (
  id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
) values
(
  '10101010-1010-4010-8010-101010101010',
  'authenticated','authenticated','release-a@innovation-os.test','',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Release User A"}'::jsonb,
  now(),now(),false,false
),
(
  '20202020-2020-4020-8020-202020202020',
  'authenticated','authenticated','release-b@innovation-os.test','',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Release User B"}'::jsonb,
  now(),now(),false,false
);

insert into public.projects (
  id, workspace_id, owner_id, title, slug, description,
  current_stage, status, visibility
) values (
  '30303030-3030-4030-8030-303030303030',
  (select id from public.workspaces where owner_id='10101010-1010-4010-8010-101010101010'::uuid and type='PERSONAL'),
  '10101010-1010-4010-8010-101010101010',
  'Release RLS Project','release-rls-project','RLS regression',
  'DISCOVERY','ACTIVE','PRIVATE'
);

insert into public.project_problems (
  project_id, problem_statement, context, affected_users, status
) values (
  '30303030-3030-4030-8030-303030303030',
  'Release security regression problem statement.',
  'Staging','Test user','ACTIVE'
);

insert into public.sources (
  id, workspace_id, source_type, external_id, doi, title,
  authors_json, url, metadata_json
) values (
  '40404040-4040-4040-8040-404040404040',
  (select id from public.workspaces where owner_id='10101010-1010-4010-8010-101010101010'::uuid and type='PERSONAL'),
  'RESEARCH_PAPER','release-source','10.0000/release.rls',
  'Release RLS Source','["Researcher"]'::jsonb,
  'https://doi.org/10.0000/release.rls','{}'::jsonb
);

insert into public.project_sources (
  project_id, source_id, relevance, notes, saved_by
) values (
  '30303030-3030-4030-8030-303030303030',
  '40404040-4040-4040-8040-404040404040',
  'PROBLEM_EVIDENCE','release regression',
  '10101010-1010-4010-8010-101010101010'
);

insert into public.claims (
  id, project_id, statement, claim_type, status
) values (
  '50505050-5050-4050-8050-505050505050',
  '30303030-3030-4030-8030-303030303030',
  'Release regression claim statement.',
  'PROBLEM','UNSUPPORTED'
);

insert into public.claim_sources (
  claim_id, source_id, relationship
) values (
  '50505050-5050-4050-8050-505050505050',
  '40404040-4040-4040-8040-404040404040',
  'SUPPORTS'
);

insert into public.prior_art_items (
  id, project_id, source_id, prior_art_type, technical_summary,
  similarity_level, shared_concepts_json, differences_json,
  comparison_json, created_by
) values (
  '60606060-6060-4060-8060-606060606060',
  '30303030-3030-4030-8030-303030303030',
  '40404040-4040-4040-8040-404040404040',
  'RESEARCH_PAPER','Prior art regression item','MEDIUM',
  '["concept"]'::jsonb,'["difference"]'::jsonb,'{}'::jsonb,
  '10101010-1010-4010-8010-101010101010'
);

insert into public.gaps (
  id, project_id, title, description, gap_type, status,
  confidence, assumptions_json, validation_questions_json, created_by
) values (
  '70707070-7070-4070-8070-707070707070',
  '30303030-3030-4030-8030-303030303030',
  'Release Gap','Grounded release security regression gap.',
  'CONTEXT','UNVALIDATED',0.7,'["assumption"]'::jsonb,
  '["question"]'::jsonb,
  '10101010-1010-4010-8010-101010101010'
);

insert into public.gap_evidence (gap_id, source_id, relationship)
values (
  '70707070-7070-4070-8070-707070707070',
  '40404040-4040-4040-8040-404040404040',
  'CONTEXT'
);

insert into public.gap_prior_art (gap_id, prior_art_id)
values (
  '70707070-7070-4070-8070-707070707070',
  '60606060-6060-4060-8060-606060606060'
);

insert into public.experiments (
  id, project_id, gap_id, title, research_question, hypothesis,
  independent_variable, dependent_variable, control_description,
  sample_description, measurement_method, protocol_json,
  success_criteria, expected_failure_modes_json, safety_notes_json,
  status, created_by
) values (
  '80808080-8080-4080-8080-808080808080',
  '30303030-3030-4030-8030-303030303030',
  '70707070-7070-4070-8070-707070707070',
  'Release Experiment',
  'Does the controlled change alter the measured outcome?',
  'The controlled change will alter the measured outcome.',
  'change','outcome','control','sample','measurement',
  '["step one","step two"]'::jsonb,
  'defined criterion','[]'::jsonb,'[]'::jsonb,
  'DRAFT',
  '10101010-1010-4010-8010-101010101010'
);

insert into public.experiment_reviews (
  id, experiment_id, issues_json, recommendations_json,
  blocking_issues_json, model_metadata_json
) values (
  '90909090-9090-4090-8090-909090909090',
  '80808080-8080-4080-8080-808080808080',
  '[]'::jsonb,'[]'::jsonb,'[]'::jsonb,
  '{"model":"release-test"}'::jsonb
);

set role authenticated;
select set_config('request.jwt.claim.sub','10101010-1010-4010-8010-101010101010', false);

do $$
begin
  if (select count(*) from public.projects where id='30303030-3030-4030-8030-303030303030') <> 1 then
    raise exception 'RLS regression: owner cannot read project';
  end if;
  if (select count(*) from public.project_sources where project_id='30303030-3030-4030-8030-303030303030') <> 1 then
    raise exception 'RLS regression: owner cannot read evidence';
  end if;
  if (select count(*) from public.prior_art_items where project_id='30303030-3030-4030-8030-303030303030') <> 1 then
    raise exception 'RLS regression: owner cannot read prior art';
  end if;
  if (select count(*) from public.gaps where project_id='30303030-3030-4030-8030-303030303030') <> 1 then
    raise exception 'RLS regression: owner cannot read gap';
  end if;
  if (select count(*) from public.experiments where project_id='30303030-3030-4030-8030-303030303030') <> 1 then
    raise exception 'RLS regression: owner cannot read experiment';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub','20202020-2020-4020-8020-202020202020', false);

do $$
declare
  v_rows integer;
begin
  if (select count(*) from public.projects where id='30303030-3030-4030-8030-303030303030') <> 0 then
    raise exception 'RLS breach: cross-tenant project read';
  end if;
  if (select count(*) from public.project_sources where project_id='30303030-3030-4030-8030-303030303030') <> 0 then
    raise exception 'RLS breach: cross-tenant evidence read';
  end if;
  if (select count(*) from public.claims where project_id='30303030-3030-4030-8030-303030303030') <> 0 then
    raise exception 'RLS breach: cross-tenant claims read';
  end if;
  if (select count(*) from public.prior_art_items where project_id='30303030-3030-4030-8030-303030303030') <> 0 then
    raise exception 'RLS breach: cross-tenant prior-art read';
  end if;
  if (select count(*) from public.gaps where project_id='30303030-3030-4030-8030-303030303030') <> 0 then
    raise exception 'RLS breach: cross-tenant gap read';
  end if;
  if (select count(*) from public.experiments where project_id='30303030-3030-4030-8030-303030303030') <> 0 then
    raise exception 'RLS breach: cross-tenant experiment read';
  end if;
  if (
    select count(*)
    from public.experiment_reviews er
    join public.experiments e on e.id=er.experiment_id
    where e.project_id='30303030-3030-4030-8030-303030303030'
  ) <> 0 then
    raise exception 'RLS breach: cross-tenant experiment review read';
  end if;

  update public.projects
  set title='HACKED'
  where id='30303030-3030-4030-8030-303030303030';
  get diagnostics v_rows = row_count;
  if v_rows <> 0 then
    raise exception 'RLS breach: cross-tenant project update';
  end if;
end;
$$;

reset role;

do $$
begin
  if has_table_privilege('anon','public.projects','SELECT') then
    raise exception 'Privilege breach: anon can SELECT projects';
  end if;
  if has_table_privilege('anon','public.sources','SELECT') then
    raise exception 'Privilege breach: anon can SELECT sources';
  end if;
  if has_table_privilege('authenticated','public.rate_limit_buckets','SELECT') then
    raise exception 'Privilege breach: authenticated can SELECT rate-limit buckets';
  end if;
end;
$$;

rollback;
select 'RLS_RELEASE_GATE_PASSED' as result;
