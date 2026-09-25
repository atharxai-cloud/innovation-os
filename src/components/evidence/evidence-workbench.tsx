"use client";

import { useMemo, useState } from "react";
import type { EvidenceSearchResult, EvidenceSearchType } from "@/lib/research/types";

type Claim = {
  id: string;
  statement: string;
  claim_type: string;
  status: string;
};

type SavedSource = {
  id: string;
  title: string;
  doi: string | null;
  url: string;
  authors_json: unknown;
  published_at: string | null;
};

export function EvidenceWorkbench({
  projectId,
  initialClaims,
  savedSources,
}: {
  projectId: string;
  initialClaims: Claim[];
  savedSources: SavedSource[];
}) {
  const [claims, setClaims] = useState(initialClaims);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<EvidenceSearchType>("PROBLEM_EVIDENCE");
  const [results, setResults] = useState<EvidenceSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [claimText, setClaimText] = useState("");
  const [selectedClaim, setSelectedClaim] = useState("");
  const [relationship, setRelationship] = useState<"SUPPORTS" | "CHALLENGES" | "CONTEXT">("SUPPORTS");
  const [message, setMessage] = useState("");

  const board = useMemo(() => {
    return {
      supported: claims.filter((c) => c.status === "SUPPORTED"),
      mixed: claims.filter((c) => c.status === "MIXED"),
      unsupported: claims.filter((c) => c.status === "UNSUPPORTED"),
      unknown: claims.filter((c) => c.status === "UNKNOWN"),
    };
  }, [claims]);

  async function createClaim() {
    if (claimText.trim().length < 5) return;
    const response = await fetch(`/api/v1/projects/${projectId}/claims`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statement: claimText, claimType: "PROBLEM" }),
    });
    if (!response.ok) {
      setMessage("تعذر إنشاء الـClaim.");
      return;
    }
    const payload = await response.json() as { claim_id: string };
    setClaims((current) => [
      {
        id: payload.claim_id,
        statement: claimText.trim(),
        claim_type: "PROBLEM",
        status: "UNSUPPORTED",
      },
      ...current,
    ]);
    setClaimText("");
    setSelectedClaim(payload.claim_id);
    setMessage("تم إنشاء الـClaim.");
  }

  async function search() {
    if (query.trim().length < 5) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/evidence/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, type }),
      });
      const payload = await response.json() as { results?: EvidenceSearchResult[] };
      if (!response.ok) throw new Error();
      setResults(payload.results ?? []);
    } catch {
      setMessage("تعذر إكمال البحث. لم يتم إنشاء نتائج بديلة.");
    } finally {
      setLoading(false);
    }
  }

  async function save(source: EvidenceSearchResult) {
    const response = await fetch(`/api/v1/projects/${projectId}/evidence/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source,
        claimId: selectedClaim || null,
        relationship: selectedClaim ? relationship : null,
        relevance: type,
      }),
    });

    setMessage(response.ok ? "تم حفظ المصدر وربطه بالمشروع." : "تعذر حفظ المصدر.");
    if (response.ok) window.location.reload();
  }

  return (
    <div className="grid gap-6">
      <section className="surface p-6">
        <p className="text-sm font-semibold text-[var(--accent)]">Evidence Board</p>
        <h1 className="mt-2 text-3xl font-semibold">لوحة الأدلة</h1>
        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <BoardColumn title="Supported" items={board.supported} />
          <BoardColumn title="Mixed" items={board.mixed} />
          <BoardColumn title="Unsupported" items={board.unsupported} />
          <BoardColumn title="Unknown" items={board.unknown} />
        </div>
      </section>

      <section className="surface p-6">
        <h2 className="text-xl font-semibold">أضف Claim قبل البحث</h2>
        <div className="mt-4 flex gap-3">
          <input
            value={claimText}
            onChange={(e) => setClaimText(e.target.value)}
            placeholder="مثال: الفصول الفارغة تسبب هدراً ملموساً في استهلاك الطاقة"
            className="min-w-0 flex-1 rounded-2xl border border-[var(--border)] bg-white px-4 py-3"
          />
          <button onClick={createClaim} className="rounded-full bg-[var(--accent)] px-5 py-3 font-semibold text-white">
            إنشاء Claim
          </button>
        </div>
      </section>

      <section className="surface p-6">
        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={3}
            placeholder="ما السؤال أو الادعاء الذي تريد البحث عن دليل له؟"
            className="rounded-2xl border border-[var(--border)] bg-white p-4"
          />
          <select value={type} onChange={(e) => setType(e.target.value as EvidenceSearchType)} className="rounded-2xl border border-[var(--border)] bg-white px-4">
            <option value="PROBLEM_EVIDENCE">Problem Evidence</option>
            <option value="SCIENTIFIC_MECHANISM">Scientific Mechanism</option>
            <option value="TECHNOLOGY_EVIDENCE">Technology Evidence</option>
            <option value="MEASUREMENT_METHOD">Measurement Method</option>
          </select>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <select value={selectedClaim} onChange={(e) => setSelectedClaim(e.target.value)} className="rounded-full border border-[var(--border)] bg-white px-4 py-2.5">
            <option value="">حفظ بدون ربط Claim</option>
            {claims.map((claim) => <option key={claim.id} value={claim.id}>{claim.statement}</option>)}
          </select>
          <select value={relationship} onChange={(e) => setRelationship(e.target.value as typeof relationship)} className="rounded-full border border-[var(--border)] bg-white px-4 py-2.5">
            <option value="SUPPORTS">Supports</option>
            <option value="CHALLENGES">Challenges</option>
            <option value="CONTEXT">Context</option>
          </select>
          <button onClick={search} disabled={loading} className="rounded-full bg-[var(--accent)] px-5 py-3 font-semibold text-white disabled:opacity-50">
            {loading ? "جارٍ البحث..." : "Search Evidence"}
          </button>
        </div>

        {message ? <p className="mt-4 text-sm text-[var(--muted-foreground)]">{message}</p> : null}

        <div className="mt-6 grid gap-4">
          {results.map((result) => (
            <article key={result.externalId} className="rounded-2xl border border-[var(--border)] p-5">
              <h3 className="font-semibold leading-7">{result.title}</h3>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                {result.authors.slice(0, 4).join("، ")}
                {result.publishedAt ? ` · ${result.publishedAt}` : ""}
                {result.doi ? ` · DOI: ${result.doi}` : ""}
              </p>
              {result.abstract ? <p className="mt-3 line-clamp-4 text-sm leading-6 text-[var(--muted-foreground)]">{result.abstract}</p> : null}
              <div className="mt-4 flex gap-3">
                <a href={result.url} target="_blank" rel="noreferrer" className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold">فتح المصدر</a>
                <button onClick={() => save(result)} className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">حفظ المصدر</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="surface p-6">
        <h2 className="text-xl font-semibold">المصادر المحفوظة</h2>
        <div className="mt-4 grid gap-3">
          {savedSources.length ? savedSources.map((source) => (
            <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="rounded-2xl border border-[var(--border)] p-4">
              <p className="font-semibold">{source.title}</p>
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">{source.doi ?? "بدون DOI"}</p>
            </a>
          )) : <p className="text-[var(--muted-foreground)]">لم تحفظ أي مصدر بعد.</p>}
        </div>
      </section>
    </div>
  );
}

function BoardColumn({ title, items }: { title: string; items: Claim[] }) {
  return (
    <div className="rounded-2xl bg-[var(--surface-muted)] p-4">
      <p className="text-sm font-semibold">{title} · {items.length}</p>
      <div className="mt-3 grid gap-2">
        {items.map((item) => <div key={item.id} className="rounded-xl bg-white p-3 text-sm leading-6">{item.statement}</div>)}
      </div>
    </div>
  );
}
