import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ projectId: string; experimentId: string }> },
) {
  const { projectId, experimentId } = await context.params;
  const supabase = await createClient();

  const { data: experiment } = await supabase
    .from("experiments")
    .select("id")
    .eq("project_id", projectId)
    .eq("id", experimentId)
    .maybeSingle();

  if (!experiment) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data, error } = await supabase.rpc("mark_experiment_ready", {
    p_experiment_id: experimentId,
  });

  if (error || data !== "READY") {
    return NextResponse.json(
      { error: "not_ready", reason: error?.message ?? "Latest review has blockers" },
      { status: 409 },
    );
  }

  return NextResponse.json({ status: "READY" });
}
