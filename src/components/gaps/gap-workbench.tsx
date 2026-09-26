"use client";

import { useState } from "react";
import type { GapCandidate } from "@/lib/gaps/types";

type SavedGap = {
  id: string;
  title: string;
  description: string;
  gap_type: string;
  status: string;
  confidence: number | null;
  assumptions_json: unknown;
  validation_questions_json: unknown;
};

export function GapWorkbench({
  projectId,
  savedGaps,
}: {
  projectId: string;
  savedGaps: SavedGap[];
}) {
  const [candidates, setCandidates] = useState<GapCandidate[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/gaps/generate`, {
        method: "POST",
      });
      const payload = await response.json() as {
        gaps?: GapCandidate[];
        error?: string;
        requirements?: Record<string, number>;
      };

      if (response.status === 409) {
        setMessage("Gap Finder يحتاج مصدر Evidence محفوظًا واحدًا على الأقل وPrior-Art item واحدًا قبل التشغيل.");
        setCandidates([]);
        return;
      }

      if (!response.ok) throw new Error();
      setCandidates(payload.gaps ?? []);
    } catch {
      setMessage("تعذر توليد Gap Hypotheses. لم يتم إنشاء فجوات بديلة غير موثقة.");
    } finally {
      setLoading(false);
    }
  }

  async function save(gap: GapCandidate) {
    setMessage("جارٍ حفظ الفجوة وروابطها...");
    const response = await fetch(`/api/v1/projects/${projectId}/gaps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gap }),
    });

    if (!response.ok) {
      setMessage("تعذر حفظ الفجوة لأنها غير مرتبطة بسياق موثوق كافٍ.");
      return;
    }

    setMessage("تم حفظ Gap Hypothesis بحالة UNVALIDATED.");
    window.location.reload();
  }

  return (
    <div className="grid gap-6">
      <section className="surface p-6">
        <p className="text-sm font-semibold text-[var(--accent)]">Gap Finder</p>
        <h1 className="mt-2 text-3xl font-semibold">اكتشاف فجوات محتملة</h1>
        <p className="mt-3 leading-7 text-[var(--muted-foreground)]">
          Gap Finder لا يعلن أن المشروع جديد. إنه يستخرج فرضيات فجوة من الأدلة والأعمال السابقة، وتبقى كل فجوة UNVALIDATED حتى تُختبر.
        </p>
        <button
          onClick={generate}
          disabled={loading}
          className="mt-5 rounded-full bg-[var(--accent)] px-5 py-3 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "جارٍ تحليل Evidence + Prior Art..." : "Find Potential Gaps"}
        </button>
        {message ? <p className="mt-4 text-sm text-[var(--muted-foreground)]">{message}</p> : null}
      </section>

      {candidates.length ? (
        <section className="grid gap-4">
          {candidates.map((gap, index) => (
            <article key={`${index}-${gap.title}`} className="surface p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-[var(--accent)]">{gap.gap_type}</p>
                  <h2 className="mt-1 text-xl font-semibold">{gap.title}</h2>
                </div>
                <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold">
                  UNVALIDATED · {Math.round(gap.confidence * 100)}%
                </span>
              </div>
              <p className="mt-4 leading-7 text-[var(--muted-foreground)]">{gap.description}</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <List title="Known Limitation" items={[gap.known_limitation]} />
                <List title="Opportunity Rationale" items={[gap.opportunity_rationale]} />
                <List title="Assumptions" items={gap.assumptions} />
                <List title="Validation Questions" items={gap.validation_questions} />
              </div>
              <p className="mt-4 text-xs text-[var(--muted-foreground)]">
                Grounded in {gap.evidence_source_ids.length} evidence source(s) and {gap.prior_art_ids.length} prior-art item(s).
              </p>
              <button
                onClick={() => save(gap)}
                className="mt-5 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white"
              >
                حفظ Gap Hypothesis
              </button>
            </article>
          ))}
        </section>
      ) : null}

      <section className="surface p-6">
        <h2 className="text-xl font-semibold">الفجوات المحفوظة</h2>
        <div className="mt-4 grid gap-4">
          {savedGaps.length === 0 ? (
            <p className="text-[var(--muted-foreground)]">لا توجد Gap Hypotheses محفوظة بعد.</p>
          ) : savedGaps.map((gap) => (
            <article key={gap.id} className="rounded-2xl border border-[var(--border)] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-[var(--accent)]">{gap.gap_type}</p>
                  <h3 className="mt-1 font-semibold">{gap.title}</h3>
                </div>
                <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold">{gap.status}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{gap.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl bg-[var(--surface-muted)] p-4">
      <p className="text-xs font-semibold">{title}</p>
      <ul className="mt-3 grid gap-2 text-sm leading-6">
        {items.map((item, index) => <li key={index}>{item}</li>)}
      </ul>
    </div>
  );
}
