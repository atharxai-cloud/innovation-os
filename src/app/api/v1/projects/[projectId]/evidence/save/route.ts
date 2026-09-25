import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveCrossrefDoi } from "@/lib/research/crossref";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const source = body?.source;

  if (!source || typeof source !== "object") {
    return NextResponse.json({ error: "invalid_source" }, { status: 400 });
  }

  const raw = source as Record<string, unknown>;
  const doi = typeof raw.doi === "string" ? raw.doi.trim() : null;
  const enriched = doi ? await resolveCrossrefDoi(doi).catch(() => null) : null;

  const normalized = {
    source_type: "RESEARCH_PAPER",
    external_id: typeof raw.externalId === "string" ? raw.externalId : null,
    doi,
    title:
      enriched?.title ??
      (typeof raw.title === "string" ? raw.title : "Untitled"),
    authors:
      enriched?.authors?.length
        ? enriched.authors
        : Array.isArray(raw.authors)
          ? raw.authors
          : [],
    published_at:
      typeof raw.publishedAt === "string" ? raw.publishedAt : null,
    url:
      enriched?.url ??
      (typeof raw.url === "string" ? raw.url : ""),
    metadata: {
      provider: "OPENALEX",
      abstract: typeof raw.abstract === "string" ? raw.abstract : null,
      cited_by_count: typeof raw.citedByCount === "number" ? raw.citedByCount : null,
      open_access: typeof raw.openAccess === "boolean" ? raw.openAccess : null,
      crossref: enriched?.metadata ?? null,
    },
  };

  const claimId = typeof body?.claimId === "string" && body.claimId ? body.claimId : null;
  const relationship =
    body?.relationship === "SUPPORTS" ||
    body?.relationship === "CHALLENGES" ||
    body?.relationship === "CONTEXT"
      ? body.relationship
      : null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_evidence_source", {
    p_project_id: projectId,
    p_source: normalized,
    p_relevance: typeof body?.relevance === "string" ? body.relevance : null,
    p_notes: typeof body?.notes === "string" ? body.notes : null,
    p_claim_id: claimId,
    p_relationship: claimId ? relationship ?? "CONTEXT" : null,
  });

  if (error || !data) {
    return NextResponse.json({ error: "save_failed" }, { status: 400 });
  }

  return NextResponse.json({ source_id: data });
}
