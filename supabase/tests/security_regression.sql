\set ON_ERROR_STOP on

-- Structural security invariants
DO $$
DECLARE
  missing_rls text[];
BEGIN
  SELECT array_agg(c.relname ORDER BY c.relname)
  INTO missing_rls
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = ANY (ARRAY[
      'profiles','workspaces','workspace_members','projects','project_members',
      'project_problems','project_assumptions','project_questions','project_snapshots',
      'audit_events','ai_runs','ai_artifacts','ai_pre_auth_runs','rate_limit_buckets',
      'background_jobs','operational_events','workspace_ai_budgets','ops_alert_state',
      'sources','project_sources','claims','claim_sources','prior_art_items','gaps',
      'gap_evidence','gap_prior_art','experiments','experiment_reviews'
    ])
    AND NOT c.relrowsecurity;

  IF missing_rls IS NOT NULL THEN
    RAISE EXCEPTION 'RLS missing on: %', missing_rls;
  END IF;
END
$$;

DO $$
DECLARE
  exposed text[];
BEGIN
  SELECT array_agg(table_name ORDER BY table_name)
  INTO exposed
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public'
    AND grantee = 'anon'
    AND table_name = ANY (ARRAY[
      'profiles','workspaces','workspace_members','projects','project_members',
      'project_problems','project_assumptions','project_questions','project_snapshots',
      'audit_events','ai_runs','ai_artifacts','ai_pre_auth_runs','rate_limit_buckets',
      'background_jobs','operational_events','workspace_ai_budgets','ops_alert_state',
      'sources','project_sources','claims','claim_sources','prior_art_items','gaps',
      'gap_evidence','gap_prior_art','experiments','experiment_reviews'
    ]);

  IF exposed IS NOT NULL THEN
    RAISE EXCEPTION 'anon unexpectedly has table grants on: %', exposed;
  END IF;
END
$$;

DO $$
BEGIN
  IF has_table_privilege('authenticated', 'public.experiment_reviews', 'insert') THEN
    RAISE EXCEPTION 'authenticated must not INSERT experiment_reviews';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.experiment_reviews', 'select') THEN
    RAISE EXCEPTION 'authenticated must be able to SELECT authorized experiment_reviews';
  END IF;

  IF has_table_privilege('authenticated', 'public.ai_runs', 'insert')
     OR has_table_privilege('authenticated', 'public.ai_runs', 'update')
     OR has_table_privilege('authenticated', 'public.ai_runs', 'delete') THEN
    RAISE EXCEPTION 'authenticated must not mutate ai_runs';
  END IF;

  IF has_table_privilege('authenticated', 'public.ai_pre_auth_runs', 'select')
     OR has_table_privilege('authenticated', 'public.ai_pre_auth_runs', 'insert')
     OR has_table_privilege('authenticated', 'public.ai_pre_auth_runs', 'update')
     OR has_table_privilege('authenticated', 'public.ai_pre_auth_runs', 'delete') THEN
    RAISE EXCEPTION 'authenticated must not access ai_pre_auth_runs';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.background_jobs', 'select')
     OR has_table_privilege('authenticated', 'public.background_jobs', 'insert')
     OR has_table_privilege('authenticated', 'public.background_jobs', 'update')
     OR has_table_privilege('authenticated', 'public.background_jobs', 'delete') THEN
    RAISE EXCEPTION 'background_jobs browser grants are not least-privilege';
  END IF;

  IF has_table_privilege('authenticated', 'public.operational_events', 'select')
     OR has_table_privilege('authenticated', 'public.workspace_ai_budgets', 'select')
     OR has_table_privilege('authenticated', 'public.ops_alert_state', 'select')
     OR has_table_privilege('authenticated', 'public.rate_limit_buckets', 'select') THEN
    RAISE EXCEPTION 'authenticated must not read operational control tables';
  END IF;

  IF has_function_privilege(
       'authenticated',
       'public.consume_rate_limit(text,text,integer,integer)',
       'execute'
     ) THEN
    RAISE EXCEPTION 'authenticated must not execute consume_rate_limit';
  END IF;
END
$;

-- Synthetic identities for RLS/state-machine regression.
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) VALUES
(
  '00000000-0000-0000-0000-000000000000',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'authenticated', 'authenticated', 'release-a@example.invalid', '',
  now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now()
),
(
  '00000000-0000-0000-0000-000000000000',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'authenticated', 'authenticated', 'release-b@example.invalid', '',
  now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now()
);

-- User A creates a project and a gap through authenticated privileges.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

INSERT INTO public.projects (id, workspace_id, owner_id, title, slug, description)
SELECT
  '11111111-1111-4111-8111-111111111111',
  w.id,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Release Regression Project',
  'release-regression-project',
  'Synthetic project for CI security regression'
FROM public.workspaces w
WHERE w.owner_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  AND w.type = 'PERSONAL';

INSERT INTO public.gaps (
  id, project_id, title, description, gap_type, status, created_by
) VALUES (
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'Synthetic Gap',
  'Synthetic gap hypothesis used only for release regression testing.',
  'OTHER',
  'UNVALIDATED',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
);

INSERT INTO public.experiments (
  id, project_id, gap_id, title, research_question, hypothesis,
  status, created_by
) VALUES (
  '33333333-3333-4333-8333-333333333333',
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  'Synthetic Experiment',
  'Does the synthetic intervention change the synthetic outcome?',
  'The synthetic intervention changes the synthetic outcome.',
  'DRAFT',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
);
COMMIT;

-- Durable rate limiter must enforce the configured quota.
DO $
DECLARE
  first_allowed boolean;
  second_allowed boolean;
BEGIN
  first_allowed := public.consume_rate_limit(
    'CI_TEST',
    'security-regression-key',
    1,
    600
  );
  second_allowed := public.consume_rate_limit(
    'CI_TEST',
    'security-regression-key',
    1,
    600
  );

  IF first_allowed IS DISTINCT FROM true OR second_allowed IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'durable rate limiter did not enforce quota';
  END IF;

  DELETE FROM public.rate_limit_buckets
  WHERE scope = 'CI_TEST' AND key_hash = 'security-regression-key';
END
$;

-- Durable queue must enqueue, claim, and complete a project-scoped job.
DO $
DECLARE
  v_workspace_id uuid;
  v_job_id uuid;
  v_msg_id bigint;
  v_status text;
BEGIN
  SELECT workspace_id INTO v_workspace_id
  FROM public.projects
  WHERE id = '11111111-1111-4111-8111-111111111111';

  v_job_id := public.enqueue_background_job(
    v_workspace_id,
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'EVIDENCE_SEARCH',
    '{"query":"synthetic evidence","type":"PROBLEM_EVIDENCE"}'::jsonb
  );

  SELECT msg_id INTO v_msg_id
  FROM public.claim_background_jobs(1)
  WHERE job_id = v_job_id;

  IF v_msg_id IS NULL THEN
    RAISE EXCEPTION 'background job could not be claimed';
  END IF;

  PERFORM public.complete_background_job(
    v_job_id,
    v_msg_id,
    '{"ok":true}'::jsonb
  );

  SELECT status INTO v_status
  FROM public.background_jobs
  WHERE id = v_job_id;

  IF v_status <> 'SUCCEEDED' THEN
    RAISE EXCEPTION 'background job did not complete successfully';
  END IF;

  DELETE FROM public.background_jobs WHERE id = v_job_id;
END
$;

-- User B must not see User A's tenant data.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

DO $$
DECLARE
  project_count integer;
  gap_count integer;
  experiment_count integer;
BEGIN
  SELECT count(*) INTO project_count
  FROM public.projects
  WHERE id = '11111111-1111-4111-8111-111111111111';

  SELECT count(*) INTO gap_count
  FROM public.gaps
  WHERE id = '22222222-2222-4222-8222-222222222222';

  SELECT count(*) INTO experiment_count
  FROM public.experiments
  WHERE id = '33333333-3333-4333-8333-333333333333';

  IF project_count <> 0 OR gap_count <> 0 OR experiment_count <> 0 THEN
    RAISE EXCEPTION
      'cross-tenant isolation failed: projects=%, gaps=%, experiments=%',
      project_count, gap_count, experiment_count;
  END IF;
END
$$;
ROLLBACK;

-- State machine: invalid DISCOVERY -> EVIDENCE jump must fail.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

DO $$
DECLARE
  rejected boolean := false;
BEGIN
  BEGIN
    UPDATE public.projects
    SET current_stage = 'EVIDENCE'
    WHERE id = '11111111-1111-4111-8111-111111111111';
  EXCEPTION WHEN others THEN
    rejected := true;
  END;

  IF NOT rejected THEN
    RAISE EXCEPTION 'state machine allowed invalid DISCOVERY -> EVIDENCE transition';
  END IF;
END
$$;
ROLLBACK;

-- Experiment READY gate: cannot become READY without a critic review.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

DO $$
DECLARE
  rejected boolean := false;
BEGIN
  BEGIN
    PERFORM public.mark_experiment_ready('33333333-3333-4333-8333-333333333333');
  EXCEPTION WHEN others THEN
    rejected := true;
  END;

  IF NOT rejected THEN
    RAISE EXCEPTION 'READY gate allowed experiment without Scientific Critic review';
  END IF;
END
$$;
ROLLBACK;

-- Ensure browser role cannot mutate experiment status directly.
DO $$
BEGIN
  IF has_column_privilege('authenticated', 'public.experiments', 'status', 'update') THEN
    RAISE EXCEPTION 'authenticated must not directly UPDATE experiments.status';
  END IF;
END
$$;

SELECT 'security regression baseline passed' AS result;
