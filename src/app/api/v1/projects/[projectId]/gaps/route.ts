import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { GapCandidate } from "@/lib/gaps/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  const body = await request.json().catch(() => null) as { gap?: GapCandidate } | null;
  const gap = body?.gap;

  if (!gap || typeof gap.title !== "string" || typeof gap.description !== "string") {
    return NextResponse.json({ error: "invalid_gap" }, { status: 400 });
  }

  const supabase = await createClient();

  const [sourceRows, priorRows] = await Promise.all([
    supabase.from("project_sources").select("source_id").eq("project_id", projectId),
    supabase.from("prior_art_items").select("id").eq("project_id", projectId),
  ]);

  const allowedSources = new Set((sourceRows.data ?? []).map((item) => item.source_id));
  const allowedPrior = new Set((priorRows.data ?? []).map((item) => item.id));

  const sourceIds = gap.evidence_source_ids.filter((id) => allowedSources.has(id));
  const priorIds = gap.prior_art_ids.filter((id) => allowedPrior.has(id));

  if (!sourceIds.length || !priorIds.length) {
    return NextResponse.json({ error: "ungrounded_gap" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("save_gap_hypothesis", {
    p_project_id: projectId,
    p_gap: gap,
    p_source_ids: sourceIds,
    p_prior_art_ids: priorIds,
  });

  if (error || !data) {
    return NextResponse.json({ error: "save_failed" }, { status: 400 });
  }

  return NextResponse.json({ gap_id: data });
}
