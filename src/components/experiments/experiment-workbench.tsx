"use client";

import { FormEvent, useMemo, useState } from "react";
import type { ExperimentDraft, ScientificCriticReview } from "@/lib/experiments/types";

type Gap = {
  id: string;
  title: string;
  description: string;
  gap_type: string;
  status: string;
};

type Experiment = {
  id: string;
  gap_id: string | null;
  title: string;
  research_question: string;
  hypothesis: string;
  independent_variable: string | null;
  dependent_variable: string | null;
  control_description: string | null;
  sample_description: string | null;
  measurement_method: string | null;
  protocol_json: unknown;
  success_criteria: string | null;
  expected_failure_modes_json: unknown;
  safety_notes_json: unknown;
  status: string;
};

type Review = {
  id: string;
  experiment_id: string;
  issues_json: unknown;
  recommendations_json: unknown;
  blocking_issues_json: unknown;
  reviewed_at: string;
};

export function ExperimentWorkbench({
  projectId,
  gaps,
  experiments,
  reviews,
}: {
  projectId: string;
  gaps: Gap[];
  experiments: Experiment[];
  reviews: Review[];
}) {
  const [gapId, setGapId] = useState(gaps[0]?.id ?? "");
  const [draft, setDraft] = useState<ExperimentDraft | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const latestReview = useMemo(() => {
    const map = new Map<string, Review>();
    for (const review of reviews) {
      if (!map.has(review.experiment_id)) map.set(review.experiment_id, review);
    }
    return map;
  }, [reviews]);

  async function generate() {
    if (!gapId) {
      setMessage("احفظ Gap Hypothesis أولًا قبل تصميم التجربة.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/experiments/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gapId }),
      });
      const payload = await response.json() as { experiment?: ExperimentDraft };
      if (!response.ok || !payload.experiment) throw new Error();
      setDraft(payload.experiment);
    } catch {
      setMessage("تعذر تصميم التجربة. لم يتم إنشاء تصميم بديل غير موثوق.");
    } finally {
      setLoading(false);
    }
  }

  async function saveDraft() {
    if (!draft || !gapId) return;
    const response = await fetch(`/api/v1/projects/${projectId}/experiments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gapId, experiment: draft }),
    });

    if (!response.ok) {
      setMessage("تعذر حفظ Experiment Draft.");
      return;
    }

    setMessage("تم حفظ Experiment Draft.");
    window.location.reload();
  }

  async function review(experimentId: string) {
    setMessage("Scientific Critic يراجع التصميم...");
    const response = await fetch(
      `/api/v1/projects/${projectId}/experiments/${experimentId}/review`,
      { method: "POST" },
    );

    if (!response.ok) {
      setMessage("تعذر إكمال Scientific Critic Review.");
      return;
    }

    setMessage("اكتملت المراجعة العلمية.");
    window.location.reload();
  }

  async function markReady(experimentId: string) {
    const response = await fetch(
      `/api/v1/projects/${projectId}/experiments/${experimentId}/ready`,
      { method: "POST" },
    );

    if (!response.ok) {
      setMessage("لا يمكن اعتماد READY: آخر Review ما زال يحتوي Blocking Issues أو لا توجد مراجعة.");
      return;
    }

    setMessage("التجربة أصبحت READY.");
    window.location.reload();
  }

  async function revise(event: FormEvent<HTMLFormElement>, experimentId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());

    const response = await fetch(
      `/api/v1/projects/${projectId}/experiments/${experimentId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      setMessage("تعذر حفظ التعديلات.");
      return;
    }

    setMessage("تم حفظ التعديل. أعد تشغيل Scientific Critic.");
    window.location.reload();
  }

  return (
    <div className="grid gap-6">
      <section className="surface p-6">
        <p className="text-sm font-semibold text-[var(--accent)]">Experiment Designer</p>
        <h1 className="mt-2 text-3xl font-semibold">تصميم تجربة قابلة للاختبار</h1>
        <p className="mt-3 leading-7 text-[var(--muted-foreground)]">
          Designer يبني Draft من Gap محفوظة. الاعتماد النهائي لا يتم قبل مراجعة Scientific Critic مستقل.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <select
            value={gapId}
            onChange={(event) => setGapId(event.target.value)}
            className="min-w-0 flex-1 rounded-full border border-[var(--border)] bg-white px-4 py-3"
          >
            {gaps.length === 0 ? <option value="">لا توجد Gap Hypotheses</option> : null}
            {gaps.map((gap) => (
              <option key={gap.id} value={gap.id}>{gap.title} · {gap.status}</option>
            ))}
          </select>
          <button
            onClick={generate}
            disabled={loading || !gapId}
            className="rounded-full bg-[var(--accent)] px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? "جارٍ تصميم التجربة..." : "Generate Experiment"}
          </button>
        </div>

        {message ? <p className="mt-4 text-sm text-[var(--muted-foreground)]">{message}</p> : null}
      </section>

      {draft ? (
        <section className="surface p-6">
          <p className="text-xs font-semibold text-[var(--accent)]">DRAFT</p>
          <h2 className="mt-1 text-2xl font-semibold">{draft.title}</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Info title="Research Question" value={draft.research_question} />
            <Info title="Hypothesis" value={draft.hypothesis} />
            <Info title="Independent Variable" value={draft.independent_variable} />
            <Info title="Dependent Variable" value={draft.dependent_variable} />
            <Info title="Control" value={draft.control_description} />
            <Info title="Measurement" value={draft.measurement_method} />
            <Info title="Sample" value={draft.sample_description} />
            <Info title="Success Criteria" value={draft.success_criteria} />
          </div>
          <List title="Protocol" items={draft.protocol} />
          <List title="Expected Failure Modes" items={draft.expected_failure_modes} />
          <List title="Safety / Ethics Notes" items={draft.safety_notes} />
          <button onClick={saveDraft} className="mt-5 rounded-full bg-[var(--accent)] px-5 py-3 font-semibold text-white">
            حفظ Experiment Draft
          </button>
        </section>
      ) : null}

      <section className="grid gap-5">
        {experiments.length === 0 ? (
          <section className="surface p-6 text-[var(--muted-foreground)]">لا توجد تجارب محفوظة بعد.</section>
        ) : experiments.map((experiment) => {
          const reviewData = latestReview.get(experiment.id);
          const blockers = Array.isArray(reviewData?.blocking_issues_json)
            ? reviewData.blocking_issues_json.map(String)
            : [];
          const issues = Array.isArray(reviewData?.issues_json)
            ? reviewData.issues_json as ScientificCriticReview["issues"]
            : [];
          const recommendations = Array.isArray(reviewData?.recommendations_json)
            ? reviewData.recommendations_json.map(String)
            : [];

          return (
            <article key={experiment.id} className="surface p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-[var(--accent)]">Experiment</p>
                  <h2 className="mt-1 text-xl font-semibold">{experiment.title}</h2>
                </div>
                <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold">
                  {experiment.status}
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Info title="Research Question" value={experiment.research_question} />
                <Info title="Hypothesis" value={experiment.hypothesis} />
                <Info title="Control" value={experiment.control_description ?? "غير محدد"} />
                <Info title="Measurement" value={experiment.measurement_method ?? "غير محدد"} />
                <Info title="Success Criteria" value={experiment.success_criteria ?? "غير محدد"} />
              </div>

              {reviewData ? (
                <div className="mt-5 rounded-2xl border border-[var(--border)] p-5">
                  <p className="font-semibold">Scientific Critic Review</p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    Blocking Issues: {blockers.length}
                  </p>
                  {issues.length ? (
                    <div className="mt-4 grid gap-2">
                      {issues.map((issue, index) => (
                        <div key={index} className="rounded-xl bg-[var(--surface-muted)] p-3 text-sm">
                          <strong>{issue.severity} · {issue.category}</strong>
                          <p className="mt-1">{issue.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <List title="Recommendations" items={recommendations} />
                  <List title="Blocking Issues" items={blockers} />
                </div>
              ) : null}

              {experiment.status !== "READY" && experiment.status !== "ARCHIVED" ? (
                <details className="mt-5 rounded-2xl border border-[var(--border)] p-4">
                  <summary className="cursor-pointer font-semibold">تعديل التصميم</summary>
                  <form onSubmit={(event) => revise(event, experiment.id)} className="mt-4 grid gap-3">
                    <Field name="title" label="Title" value={experiment.title} />
                    <Field name="research_question" label="Research Question" value={experiment.research_question} multiline />
                    <Field name="hypothesis" label="Hypothesis" value={experiment.hypothesis} multiline />
                    <Field name="independent_variable" label="Independent Variable" value={experiment.independent_variable ?? ""} />
                    <Field name="dependent_variable" label="Dependent Variable" value={experiment.dependent_variable ?? ""} />
                    <Field name="control_description" label="Control" value={experiment.control_description ?? ""} multiline />
                    <Field name="sample_description" label="Sample" value={experiment.sample_description ?? ""} multiline />
                    <Field name="measurement_method" label="Measurement Method" value={experiment.measurement_method ?? ""} multiline />
                    <Field name="success_criteria" label="Success Criteria" value={experiment.success_criteria ?? ""} multiline />
                    <Field name="protocol" label="Protocol — one step per line" value={asLines(experiment.protocol_json)} multiline />
                    <Field name="expected_failure_modes" label="Failure Modes — one per line" value={asLines(experiment.expected_failure_modes_json)} multiline />
                    <Field name="safety_notes" label="Safety Notes — one per line" value={asLines(experiment.safety_notes_json)} multiline />
                    <button className="rounded-full border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold">
                      حفظ التعديلات
                    </button>
                  </form>
                </details>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3">
                {experiment.status !== "READY" && experiment.status !== "ARCHIVED" ? (
                  <button onClick={() => review(experiment.id)} className="rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white">
                    Run Scientific Critic
                  </button>
                ) : null}
                {experiment.status === "AI_REVIEWED" ? (
                  <button onClick={() => markReady(experiment.id)} className="rounded-full border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold">
                    Mark READY
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function Info({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--surface-muted)] p-4">
      <p className="text-xs font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6">{value}</p>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold text-[var(--muted-foreground)]">{title}</p>
      <ul className="mt-2 grid gap-2 text-sm">
        {items.map((item, index) => <li key={index} className="rounded-xl bg-[var(--surface-muted)] p-3">{item}</li>)}
      </ul>
    </div>
  );
}

function Field({
  name,
  label,
  value,
  multiline = false,
}: {
  name: string;
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {label}
      {multiline ? (
        <textarea name={name} defaultValue={value} rows={3} className="rounded-2xl border border-[var(--border)] bg-white p-3 font-normal" />
      ) : (
        <input name={name} defaultValue={value} className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 font-normal" />
      )}
    </label>
  );
}

function asLines(value: unknown) {
  return Array.isArray(value) ? value.map(String).join("\n") : "";
}
