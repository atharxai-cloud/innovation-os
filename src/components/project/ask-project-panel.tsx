"use client";

import { useState } from "react";
import type { AskProjectAnswer } from "@/lib/project-brain/ask-agent";

type Source = {
  id: unknown;
  title: unknown;
  doi: unknown;
  url: unknown;
};

const quickPrompts = [
  "ماذا أثبتنا حتى الآن؟",
  "ما أكبر نقطة ضعف في المشروع؟",
  "ما الادعاءات التي ما زالت بلا دليل؟",
  "ما أهم شيء يجب أن أفعله الآن ولماذا؟",
];

export function AskProjectPanel({ projectId }: { projectId: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AskProjectAnswer | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask(value?: string) {
    const q = (value ?? question).trim();
    if (q.length < 3) return;

    setQuestion(q);
    setLoading(true);
    setError("");
    setAnswer(null);

    try {
      const response = await fetch(`/api/v1/projects/${projectId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const payload = await response.json() as {
        answer?: AskProjectAnswer;
        sources?: Source[];
      };

      if (!response.ok || !payload.answer) throw new Error();
      setAnswer(payload.answer);
      setSources(payload.sources ?? []);
    } catch {
      setError("تعذر الإجابة من Project Context الحالي. لم يتم إنشاء إجابة بديلة غير موثقة.");
    } finally {
      setLoading(false);
    }
  }

  function sourceById(id: string) {
    return sources.find((source) => source.id === id);
  }

  return (
    <div className="mt-5 border-t border-[var(--border)] pt-5">
      <p className="text-sm font-semibold text-[var(--accent)]">Ask My Project</p>
      <div className="mt-3 grid gap-2">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => ask(prompt)}
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-right text-xs leading-5"
          >
            {prompt}
          </button>
        ))}
      </div>

      <textarea
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        rows={3}
        placeholder="اسأل عن مشروعك..."
        className="mt-3 w-full rounded-2xl border border-[var(--border)] bg-white p-3 text-sm"
      />
      <button
        type="button"
        onClick={() => ask()}
        disabled={loading}
        className="mt-2 w-full rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {loading ? "جارٍ بناء Context Pack..." : "اسأل المشروع"}
      </button>

      {error ? <p className="mt-3 text-xs leading-5 text-[var(--danger)]">{error}</p> : null}

      {answer ? (
        <div className="mt-4 grid gap-4 text-sm">
          <div className="rounded-2xl bg-[var(--surface-muted)] p-4">
            <p className="font-semibold">الخلاصة</p>
            <p className="mt-2 leading-6">{answer.summary}</p>
          </div>

          <Section title="FACT">
            {answer.facts.map((fact, index) => (
              <div key={index} className="rounded-xl border border-[var(--border)] p-3">
                <p className="leading-6">{fact.statement}</p>
                <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">{fact.grounding}</p>
                {fact.source_ids.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {fact.source_ids.map((id) => {
                      const source = sourceById(id);
                      const url = typeof source?.url === "string" ? source.url : null;
                      const title = typeof source?.title === "string" ? source.title : id;
                      return url ? (
                        <a key={id} href={url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[var(--accent)]">
                          {title}
                        </a>
                      ) : null;
                    })}
                  </div>
                ) : null}
              </div>
            ))}
          </Section>

          <Section title="INFERENCE">
            {answer.inferences.map((item, index) => (
              <div key={index} className="rounded-xl border border-[var(--border)] p-3">
                <p className="leading-6">{item.statement}</p>
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">الأساس: {item.basis}</p>
              </div>
            ))}
          </Section>

          <Section title="RECOMMENDATION">
            {answer.recommendations.map((item, index) => (
              <div key={index} className="rounded-xl border border-[var(--border)] p-3">
                <p className="font-semibold leading-6">{item.action}</p>
                <p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">{item.reason}</p>
              </div>
            ))}
          </Section>

          <Section title="UNCERTAINTY">
            {answer.uncertainties.map((item, index) => (
              <p key={index} className="rounded-xl border border-dashed border-[var(--border)] p-3 leading-6">{item}</p>
            ))}
          </Section>
        </div>
      ) : null}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-[var(--accent)]">{title}</p>
      <div className="grid gap-2">{children}</div>
    </div>
  );
}
