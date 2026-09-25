"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { IdeaXRayResult } from "@/lib/ai/idea-xray-schema";

const STORAGE_KEY = "innovation-os:idea-xray:v1";

type StoredDraft = {
  rawIdea: string;
  analysis: IdeaXRayResult;
  createdAt: string;
};

export function IdeaXRayWorkbench() {
  const [idea, setIdea] = useState("");
  const [analysis, setAnalysis] = useState<IdeaXRayResult | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const draft = JSON.parse(saved) as StoredDraft;
      if (draft.analysis && draft.rawIdea) {
        setIdea(draft.rawIdea);
        setAnalysis(draft.analysis);
      }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  async function analyze() {
    const value = idea.trim();

    if (value.length < 20) {
      setError("اكتب وصفًا أوضح للمشكلة أو الفكرة قبل الفحص.");
      return;
    }

    setStatus("loading");
    setError("");

    try {
      const response = await fetch("/api/v1/idea-xray", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: value, language: "ar" }),
      });

      const payload = (await response.json()) as {
        analysis?: IdeaXRayResult;
        error?: string;
        message?: string;
      };

      if (!response.ok || !payload.analysis) {
        throw new Error(payload.message || payload.error || "analysis_failed");
      }

      setAnalysis(payload.analysis);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          rawIdea: value,
          analysis: payload.analysis,
          createdAt: new Date().toISOString(),
        } satisfies StoredDraft),
      );
      setStatus("idle");
    } catch {
      setStatus("error");
      setError(
        "لم يكتمل التحليل. لم يتم إنشاء نتائج بديلة أو وهمية؛ يمكنك إعادة المحاولة.",
      );
    }
  }

  return (
    <div className="grid gap-6">
      <section className="surface p-5 sm:p-7">
        <label htmlFor="idea" className="text-sm font-semibold">
          ما المشكلة أو الفكرة التي تعمل عليها؟
        </label>
        <textarea
          id="idea"
          value={idea}
          onChange={(event) => setIdea(event.target.value)}
          rows={8}
          maxLength={5000}
          className="mt-3 w-full resize-y rounded-2xl border border-[var(--border)] bg-white p-4 leading-7 outline-none focus:border-[var(--accent)]"
          placeholder="مثال: أريد تطوير نظام يقلل تشغيل المكيفات في الفصول الفارغة..."
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            لا يتم حفظ النص في قاعدة البيانات قبل إنشاء حسابك.
          </p>
          <button
            type="button"
            onClick={analyze}
            disabled={status === "loading"}
            className="rounded-full bg-[var(--accent)] px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {status === "loading" ? "جارٍ تحليل الفكرة..." : "افحص الفكرة"}
          </button>
        </div>
        {error ? (
          <p className="mt-4 rounded-2xl border border-[var(--border)] p-4 text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}
      </section>

      {analysis ? <IdeaXRayResultView analysis={analysis} /> : null}
    </div>
  );
}

function IdeaXRayResultView({ analysis }: { analysis: IdeaXRayResult }) {
  return (
    <section className="grid gap-5">
      <div className="surface p-6 sm:p-8">
        <p className="text-sm font-semibold text-[var(--accent)]">
          Idea X-Ray Result
        </p>
        <h2 className="mt-2 text-3xl font-semibold">{analysis.project_title}</h2>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          <ResultCard label="المشكلة" value={analysis.problem} />
          <ResultCard label="السياق" value={analysis.context} />
          <ResultCard label="المستفيد / المتأثر" value={analysis.affected_users} />
          <ResultCard label="اتجاه الحل المقترح" value={analysis.proposed_direction} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ListCard title="الافتراضات" items={analysis.assumptions} />
        <ListCard title="المجهولات" items={analysis.unknowns} />
        <ListCard title="المخاطر" items={analysis.risks} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ListCard title="الأسئلة الحرجة" items={analysis.critical_questions} />
        <ListCard
          title="اتجاهات البحث المقترحة"
          items={analysis.suggested_search_directions}
        />
      </div>

      <section className="surface p-6">
        <p className="text-sm font-semibold text-[var(--accent)]">
          Next Best Action
        </p>
        <h3 className="mt-2 text-2xl font-semibold">
          {analysis.next_best_action.action}
        </h3>
        <p className="mt-3 leading-7 text-[var(--muted-foreground)]">
          {analysis.next_best_action.reason}
        </p>
        {analysis.next_best_action.blocking_issue ? (
          <p className="mt-4 rounded-2xl bg-[var(--surface-muted)] p-4 text-sm">
            العائق الحالي: {analysis.next_best_action.blocking_issue}
          </p>
        ) : null}

        <Link
          href="/idea-xray/convert"
          className="mt-6 inline-flex rounded-full bg-[var(--accent)] px-5 py-3 font-semibold text-white"
        >
          ابدأ مشروعك
        </Link>
      </section>
    </section>
  );
}

function ResultCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-2 leading-7 text-[var(--muted-foreground)]">{value}</p>
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="surface p-5">
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-4 grid gap-3">
        {items.map((item, index) => (
          <li
            key={`${index}-${item}`}
            className="rounded-2xl bg-[var(--surface-muted)] p-3 text-sm leading-6"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
