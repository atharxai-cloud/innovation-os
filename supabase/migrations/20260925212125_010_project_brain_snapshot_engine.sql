-- Innovation OS
-- Migration 010: Project Brain snapshot engine

create index if not exists project_snapshots_project_version_idx
  on public.project_snapshots(project_id, snapshot_version desc);

create or replace function app_private.rebuild_project_snapshot(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project public.projects%rowtype;
  v_problem public.project_problems%rowtype;
  v_open_questions jsonb := '[]'::jsonb;
  v_untested_assumptions jsonb := '[]'::jsonb;
  v_biggest_unknown text;
  v_next_action text;
  v_reason text;
  v_blocking_issue text;
  v_priority integer := 1;
  v_confidence numeric := 0.90;
  v_latest_id uuid;
  v_latest_version bigint;
  v_latest_created_at timestamptz;
begin
  select * into v_project
  from public.projects
  where id = p_project_id;

  if not found then
    return;
  end if;

  select * into v_problem
  from public.project_problems
  where project_id = p_project_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'question', q.question,
        'type', q.type,
        'priority', q.priority,
        'status', q.status
      )
      order by q.priority asc, q.created_at asc
    ),
    '[]'::jsonb
  )
  into v_open_questions
  from public.project_questions q
  where q.project_id = p_project_id
    and q.status in ('OPEN','IN_PROGRESS');

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'category', a.category,
        'statement', a.statement,
        'status', a.status
      )
      order by a.created_at asc
    ),
    '[]'::jsonb
  )
  into v_untested_assumptions
  from public.project_assumptions a
  where a.project_id = p_project_id
    and a.status = 'UNTESTED';

  select q.question
  into v_biggest_unknown
  from public.project_questions q
  where q.project_id = p_project_id
    and q.status in ('OPEN','IN_PROGRESS')
  order by q.priority asc, q.created_at asc
  limit 1;

  if v_biggest_unknown is null then
    select a.statement
    into v_biggest_unknown
    from public.project_assumptions a
    where a.project_id = p_project_id
      and a.status = 'UNTESTED'
    order by a.created_at asc
    limit 1;
  end if;

  case v_project.current_stage
    when 'DISCOVERY' then
      v_next_action := coalesce(
        (
          select q.question
          from public.project_questions q
          where q.project_id = p_project_id
            and q.status in ('OPEN','IN_PROGRESS')
            and q.type = 'PROBLEM_VALIDATION'
          order by q.priority asc, q.created_at asc
          limit 1
        ),
        'حدد المشكلة بصورة قابلة للقياس وحدد من يتأثر بها.'
      );
      v_reason := 'مرحلة الاكتشاف يجب أن تقلل الغموض حول المشكلة قبل الانتقال للحل.';
      v_blocking_issue := 'صلاحية المشكلة لم تثبت بعد.';

    when 'PROBLEM_VALIDATION' then
      v_next_action := coalesce(
        (
          select q.question
          from public.project_questions q
          where q.project_id = p_project_id
            and q.status in ('OPEN','IN_PROGRESS')
            and q.type = 'PROBLEM_VALIDATION'
          order by q.priority asc, q.created_at asc
          limit 1
        ),
        'وثّق دليلًا يثبت حجم المشكلة وأثرها.'
      );
      v_reason := 'لا ينبغي الانتقال إلى البحث عن الحلول قبل إثبات وجود المشكلة وحجمها.';
      v_blocking_issue := 'التحقق من المشكلة غير مكتمل.';

    when 'EVIDENCE' then
      v_next_action := 'ابحث عن أدلة فعلية مرتبطة بادعاءات المشروع واحفظ المصادر.';
      v_reason := 'مرحلة Evidence تتطلب مصادر قابلة للتحقق، لا استنتاجات غير موثقة.';
      v_blocking_issue := 'الأدلة المحفوظة لم تصل بعد إلى مستوى كافٍ لدعم الانتقال.';

    when 'PRIOR_ART' then
      v_next_action := 'قارن أقرب الأعمال السابقة وحدد ما المشترك وما المختلف.';
      v_reason := 'لا يمكن تعريف فجوة قابلة للدفاع عنها قبل فهم الحلول والأبحاث السابقة.';
      v_blocking_issue := 'التميّز التقني غير مثبت.';

    when 'GAP_DEFINITION' then
      v_next_action := 'صغ فجوة واحدة قابلة للتحقق واربطها بالأدلة والأعمال السابقة.';
      v_reason := 'الفجوة في Innovation OS فرضية يجب اختبارها وليست ادعاءً نهائيًا.';
      v_blocking_issue := 'الفجوة ما زالت غير متحققة.';

    when 'EXPERIMENT_DESIGN' then
      v_next_action := 'حوّل الفجوة إلى فرضية وتجربة بمتغيرات وقياس ومعيار نجاح.';
      v_reason := 'الهدف الآن الوصول إلى Experiment Ready بصورة منهجية.';
      v_blocking_issue := 'تصميم التجربة غير مكتمل.';

    when 'EXPERIMENT_READY' then
      v_next_action := 'راجع التصميم النهائي وسجل قرار الجاهزية قبل التنفيذ الميداني.';
      v_reason := 'المشروع وصل إلى الحد النهائي لنطاق MVP الحالي.';
      v_blocking_issue := null;
      v_priority := 2;
      v_confidence := 0.95;

    else
      v_next_action := 'راجع حالة المشروع وحدد الخطوة التالية.';
      v_reason := 'لم يتم التعرف على المرحلة الحالية.';
      v_blocking_issue := 'حالة المشروع غير معروفة.';
      v_confidence := 0.50;
  end case;

  select s.id, s.snapshot_version, s.created_at
  into v_latest_id, v_latest_version, v_latest_created_at
  from public.project_snapshots s
  where s.project_id = p_project_id
  order by s.snapshot_version desc
  limit 1;

  if v_latest_id is not null
     and v_latest_created_at >= statement_timestamp() - interval '1 second' then
    update public.project_snapshots
    set
      summary_json = jsonb_build_object(
        'title', v_project.title,
        'problem_statement', v_problem.problem_statement,
        'context', v_problem.context,
        'affected_users', v_problem.affected_users,
        'open_questions', v_open_questions,
        'untested_assumptions', v_untested_assumptions,
        'biggest_unknown', v_biggest_unknown,
        'generated_by', 'DETERMINISTIC_NAVIGATOR_V1'
      ),
      stage = v_project.current_stage,
      next_best_action_json = jsonb_build_object(
        'action', v_next_action,
        'reason', v_reason,
        'blocking_issue', v_blocking_issue,
        'priority', v_priority,
        'confidence', v_confidence,
        'generated_by', 'DETERMINISTIC_NAVIGATOR_V1'
      ),
      risk_summary_json = jsonb_build_object(
        'biggest_unknown', v_biggest_unknown,
        'blocking_issue', v_blocking_issue
      ),
      created_at = now()
    where id = v_latest_id;
  else
    insert into public.project_snapshots (
      project_id,
      snapshot_version,
      summary_json,
      stage,
      next_best_action_json,
      risk_summary_json
    ) values (
      p_project_id,
      coalesce(v_latest_version, 0) + 1,
      jsonb_build_object(
        'title', v_project.title,
        'problem_statement', v_problem.problem_statement,
        'context', v_problem.context,
        'affected_users', v_problem.affected_users,
        'open_questions', v_open_questions,
        'untested_assumptions', v_untested_assumptions,
        'biggest_unknown', v_biggest_unknown,
        'generated_by', 'DETERMINISTIC_NAVIGATOR_V1'
      ),
      v_project.current_stage,
      jsonb_build_object(
        'action', v_next_action,
        'reason', v_reason,
        'blocking_issue', v_blocking_issue,
        'priority', v_priority,
        'confidence', v_confidence,
        'generated_by', 'DETERMINISTIC_NAVIGATOR_V1'
      ),
      jsonb_build_object(
        'biggest_unknown', v_biggest_unknown,
        'blocking_issue', v_blocking_issue
      )
    );
  end if;
end;
$$;

revoke all on function app_private.rebuild_project_snapshot(uuid)
  from public, anon, authenticated;
grant execute on function app_private.rebuild_project_snapshot(uuid)
  to service_role;

create or replace function app_private.mark_project_brain_dirty()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
begin
  v_project_id := coalesce(new.project_id, old.project_id);

  update public.projects
  set updated_at = now()
  where id = v_project_id;

  return coalesce(new, old);
end;
$$;

revoke all on function app_private.mark_project_brain_dirty()
  from public, anon, authenticated;
grant execute on function app_private.mark_project_brain_dirty()
  to service_role;

drop trigger if exists project_problems_brain_dirty on public.project_problems;
create trigger project_problems_brain_dirty
after insert or update on public.project_problems
for each row execute function app_private.mark_project_brain_dirty();

drop trigger if exists project_assumptions_brain_dirty on public.project_assumptions;
create trigger project_assumptions_brain_dirty
after insert or update on public.project_assumptions
for each row execute function app_private.mark_project_brain_dirty();

drop trigger if exists project_questions_brain_dirty on public.project_questions;
create trigger project_questions_brain_dirty
after insert or update on public.project_questions
for each row execute function app_private.mark_project_brain_dirty();

create or replace function app_private.refresh_project_brain_after_project_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.rebuild_project_snapshot(new.id);
  return new;
end;
$$;

revoke all on function app_private.refresh_project_brain_after_project_change()
  from public, anon, authenticated;
grant execute on function app_private.refresh_project_brain_after_project_change()
  to service_role;

drop trigger if exists projects_refresh_brain on public.projects;
create trigger projects_refresh_brain
after update of updated_at, current_stage, status on public.projects
for each row execute function app_private.refresh_project_brain_after_project_change();

create or replace function app_private.bootstrap_project_brain()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.rebuild_project_snapshot(new.project_id);
  return new;
end;
$$;

revoke all on function app_private.bootstrap_project_brain()
  from public, anon, authenticated;
grant execute on function app_private.bootstrap_project_brain()
  to service_role;

drop trigger if exists project_problems_bootstrap_brain on public.project_problems;
create trigger project_problems_bootstrap_brain
after insert on public.project_problems
for each row execute function app_private.bootstrap_project_brain();
