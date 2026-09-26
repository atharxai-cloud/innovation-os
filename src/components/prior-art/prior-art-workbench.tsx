"use client";

import { useState } from "react";
import type { PriorArtSearchResult } from "@/lib/prior-art/types";

type SavedItem = {
  id: string;
  source_id: string;
  prior_art_type: string;
  technical_summary: string | null;
  similarity_level: string | null;
  shared_concepts_json: unknown;
  differences_json: unknown;
  created_at: string;
};

type SavedSource = {
  id: string;
  title: string;
  url: string;
  doi: string | null;
  external_id: string | null;
};

export function PriorArtWorkbench({
  projectId,
  savedItems,
  savedSources,
}: {
  projectId: string;
  savedItems: SavedItem[];
  savedSources: SavedSource[];
}) {
  const [query, setQuery] = useState("");
  const [research, setResearch] = useState<PriorArtSearchResult[]>([]);
  const [patents, setPatents] = useState<PriorArtSearchResult[]>([]);
  const [patentsAvailable, setPatentsAvailable] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function search() {
    if (query.trim().length < 5) return;
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/v1/projects/${projectId}/prior-art/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const payload = await response.json() as {
        research?: PriorArtSearchResult[];
        patents?: PriorArtSearchResult[];
        patentProviderAvailable?: boolean;
      };

      if (!response.ok) throw new Error();
      setResearch(payload.research ?? []);
      setPatents(payload.patents ?? []);
      setPatentsAvailable(payload.patentProviderAvailable ?? false);
    } catch {
      setMessage("تعذر إكمال البحث في الأعمال السابقة. لم يتم إنشاء نتائج وهمية.");
    } finally {
      setLoading(false);
    }
  }

  async function save(candidate: PriorArtSearchResult) {
    setMessage("جارٍ تحليل المقارنة...");
    const response = await fetch(`/api/v1/projects/${projectId}/prior-art/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidate }),
    });

    if (!response.ok) {
      setMessage("تعذر تحليل أو حفظ العنصر. لم يتم إصدار حكم بديل.");
      return;
    }

    setMessage("تم حفظ العنصر ومقارنته بالمشروع.");
    window.location.reload();
  }

  return (
    <div className="grid gap-6">
      <section className="surface p-6">
        <p className="text-sm font-semibold text-[var(--accent)]">Prior-Art Discovery</p>
        <h1 className="mt-2 text-3xl font-semibold">الأعمال السابقة</h1>
        <p className="mt-3 leading-7 text-[var(--muted-foreground)]">
          ابحث عن أبحاث وتقنيات وبراءات ذات صلة. التشابه هنا مفاهيمي واستكشافي وليس رأيًا قانونيًا في الجدة أو قابلية البراءة.
        </p>

        <div className="mt-6 flex gap-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="صف التقنية أو المشكلة أو آلية الحل التي تريد مقارنة الأعمال السابقة بها"
            className="min-w-0 flex-1 rounded-2xl border border-[var(--border)] bg-white px-4 py-3"
          />
          <button
            onClick={search}
            disabled={loading}
            className="rounded-full bg-[var(--accent)] px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? "جارٍ البحث..." : "تشغيل Prior-Art Scan"}
          </button>
        </div>

        {message ? <p className="mt-4 text-sm text-[var(--muted-foreground)]">{message}</p> : null}
      </section>

      <ResultsSection title="Research Papers" results={research} onSave={save} />

      <section className="surface p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Patent Records</h2>
          {!patentsAvailable ? (
            <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold">
              EPO OPS credentials required
            </span>
          ) : null}
        </div>
        {!patentsAvailable ? (
          <p className="mt-4 text-sm leading-6 text-[var(--muted-foreground)]">
            البحث الأكاديمي يعمل الآن. البحث المباشر في سجلات البراءات يتفعّل عند إضافة EPO OPS Consumer Key وSecret إلى أسرار بيئة التشغيل.
          </p>
        ) : (
          <div className="mt-4">
            <ResultCards results={patents} onSave={save} />
          </div>
        )}
      </section>

      <section className="surface p-6">
        <h2 className="text-xl font-semibold">المحفوظ للمقارنة</h2>
        <div className="mt-5 grid gap-4">
          {savedItems.length === 0 ? (
            <p className="text-[var(--muted-foreground)]">لم تحفظ أي عمل سابق بعد.</p>
          ) : savedItems.map((item) => {
            const source = savedSources.find((candidate) => candidate.id === item.source_id);
            const shared = Array.isArray(item.shared_concepts_json) ? item.shared_concepts_json : [];
            const differences = Array.isArray(item.differences_json) ? item.differences_json : [];
            return (
              <article key={item.id} className="rounded-2xl border border-[var(--border)] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[var(--accent)]">{item.prior_art_type}</p>
                    <a href={source?.url} target="_blank" rel="noreferrer" className="mt-1 block text-lg font-semibold">
                      {source?.title ?? "Prior Art"}
                    </a>
                  </div>
                  <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold">
                    {item.similarity_level ?? "UNRATED"} conceptual similarity
                  </span>
                </div>
                {item.technical_summary ? <p className="mt-4 text-sm leading-6 text-[var(--muted-foreground)]">{item.technical_summary}</p> : null}
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <List title="Shared Concepts" items={shared} />
                  <List title="Key Differences" items={differences} />
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ResultsSection({
  title,
  results,
  onSave,
}: {
  title: string;
  results: PriorArtSearchResult[];
  onSave: (candidate: PriorArtSearchResult) => void;
}) {
  return (
    <section className="surface p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-4">
        <ResultCards results={results} onSave={onSave} />
      </div>
    </section>
  );
}

function ResultCards({
  results,
  onSave,
}: {
  results: PriorArtSearchResult[];
  onSave: (candidate: PriorArtSearchResult) => void;
}) {
  return (
    <div className="grid gap-4">
      {results.map((result) => (
        <article key={`${result.provider}-${result.externalId}`} className="rounded-2xl border border-[var(--border)] p-5">
          <p className="text-xs font-semibold text-[var(--accent)]">{result.provider}</p>
          <h3 className="mt-1 font-semibold leading-7">{result.title}</h3>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            {result.authors.slice(0, 4).join("، ")}
            {result.publishedAt ? ` · ${result.publishedAt}` : ""}
          </p>
          {result.abstract ? <p className="mt-3 line-clamp-4 text-sm leading-6 text-[var(--muted-foreground)]">{result.abstract}</p> : null}
          <div className="mt-4 flex gap-3">
            <a href={result.url} target="_blank" rel="noreferrer" className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold">
              فتح المصدر
            </a>
            <button onClick={() => onSave(result)} className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">
              قارن واحفظ
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function List({ title, items }: { title: string; items: unknown[] }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[var(--muted-foreground)]">{title}</p>
      <ul className="mt-2 grid gap-2 text-sm">
        {items.map((item, index) => <li key={index} className="rounded-xl bg-[var(--surface-muted)] p-3">{String(item)}</li>)}
      </ul>
    </div>
  );
}
