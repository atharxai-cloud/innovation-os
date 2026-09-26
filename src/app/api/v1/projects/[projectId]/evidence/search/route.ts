import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchEvidence } from "@/lib/research/search";
import type { EvidenceSearchType } from "@/lib/research/types";

const allowedTypes = new Set<EvidenceSearchType>([
  "PROBLEM_EVIDENCE",
  "SCIENTIFIC_MECHANISM",
  "TECHNOLOGY_EVIDENCE",
  "MEASUREMENT_METHOD",
]);

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const actorId = typeof authData?.claims?.sub === "string" ? authData.claims.sub : null;

  const { data: project } = await supabase
    .from("projects")
    .select("id,workspace_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null) as
    | { query?: unknown; type?: unknown }
    | null;

  const query = typeof body?.query === "string" ? body.query.trim() : "";
  const type =
    typeof body?.type === "string" && allowedTypes.has(body.type as EvidenceSearchType)
      ? (body.type as EvidenceSearchType)
      : "PROBLEM_EVIDENCE";

  if (query.length < 5 || query.length > 1500) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  try {
    const result = await searchEvidence(query, type, {
      workspaceId: project.workspace_id,
      projectId,
      actorId,
      agentType: "EVIDENCE_QUERY_EXPANSION",
      inputHash: createHash("sha256").update(`${type}:${query}`).digest("hex"),
      metadata: { evidence_search_type: type },
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "research_provider_failed" },
      { status: 502 },
    );
  }
}
