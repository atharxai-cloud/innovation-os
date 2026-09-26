import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ExperimentDraft } from "@/lib/experiments/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  const body = await request.json().catch(() => null) as
    | { gapId?: unknown; experiment?: ExperimentDraft }
    | null;

  const gapId = typeof body?.gapId === "string" ? body.gapId : null;
  const experiment = body?.experiment;

  if (!experiment || typeof experiment.title !== "string" || typeof experiment.hypothesis !== "string") {
    return NextResponse.json({ error: "invalid_experiment" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_experiment_draft", {
    p_project_id: projectId,
    p_gap_id: gapId,
    p_experiment: experiment,
  });

  if (error || !data) {
    return NextResponse.json({ error: "save_failed" }, { status: 400 });
  }

  return NextResponse.json({ experiment_id: data });
}
