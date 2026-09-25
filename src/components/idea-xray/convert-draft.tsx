"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { IdeaXRayResult } from "@/lib/ai/idea-xray-schema";
import { convertIdeaXRayToProject } from "@/app/(app)/idea-xray/convert/actions";

const STORAGE_KEY = "innovation-os:idea-xray:v1";

export function ConvertIdeaXRayDraft() {
  const [analysis, setAnalysis] = useState<IdeaXRayResult | null>(null);
  const [rawIdea, setRawIdea] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as {
          analysis?: IdeaXRayResult;
          rawIdea?: string;
        };
        setAnalysis(parsed.analysis ?? null);
        setRawIdea(parsed.rawIdea ?? "");
      }
      } finally {
        setLoaded(true);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (!loaded) {
    return <p className="text-[var(--muted-foreground)]">جارٍ استعادة التحليل...</p>;
  }

  if (!analysis) {
    return (
      <section className="surface p-7">
        <h2 className="text-2xl font-semibold">لم نجد تحليلًا محفوظًا</h2>
        <p className="mt-3 text-[var(--muted-foreground)]">
          ارجع إلى Idea X-Ray ونفذ التحليل أولًا.
        </p>
        <Link
          href="/idea-xray"
          className="mt-5 inline-flex rounded-full bg-[var(--accent)] px-5 py-3 font-semibold text-white"
        >
          العودة إلى Idea X-Ray
        </Link>
      </section>
    );
  }

  return (
    <section className="surface p-7">
      <p className="text-sm font-semibold text-[var(--accent)]">
        Convert to Project
      </p>
      <h2 className="mt-2 text-3xl font-semibold">{analysis.project_title}</h2>
      <p className="mt-4 leading-7 text-[var(--muted-foreground)]">
        سنحوّل المشكلة والافتراضات والمجهولات والأسئلة الحرجة إلى Project State
        منظم. يمكنك تعديلها لاحقًا داخل المشروع.
      </p>

      <form action={convertIdeaXRayToProject} className="mt-6">
        <input
          type="hidden"
          name="analysis"
          value={JSON.stringify(analysis)}
        />
        <input type="hidden" name="rawIdea" value={rawIdea} />
        <button className="rounded-full bg-[var(--accent)] px-5 py-3 font-semibold text-white">
          إنشاء Innovation Project
        </button>
      </form>
    </section>
  );
}
