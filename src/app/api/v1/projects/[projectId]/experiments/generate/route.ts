import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { designExperiment } from "@/lib/experiments/designer";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  const body = await request.json().catch(() => null) as { gapId?: unknown } | null;
  const gapId = typeof body?.gapId === "string" ? body.gapId : "";

  if (!gapId) {
    return NextResponse.json({ error: "gap_required" }, { status: 400 });
  }

  const supabase = await createClient();
  const [project, problem, gap, claims] = await Promise.all([
    supabase.from("projects").select("id,workspace_id,title,current_stage").eq("id", projectId).maybeSingle(),
    supabase.from("project_problems").select("problem_statement,context,affected_users,current_solution_direction").eq("project_id", projectId).maybeSingle(),
    supabase.from("gaps").select("id,title,description,gap_type,status,confidence,assumptions_json,validation_questions_json").eq("project_id", projectId).eq("id", gapId).maybeSingle(),
    supabase.from("claims").select("statement,claim_type,status").eq("project_id", projectId).limit(20),
  ]);

  if (!project.data || !gap.data || gap.data.status === "REJECTED") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const draft = await designExperiment({
      project: project.data,
      problem: problem.data,
      gap: gap.data,
      claims: claims.data ?? [],
    });

    const admin = createAdminClient();
    if (admin) {
      const model = process.env.OPENAI_EXPERIMENT_DESIGNER_MODEL ?? "gpt-5.6-terra";
      const { data: run } = await admin
        .from("ai_runs")
        .insert({
          workspace_id: project.data.workspace_id,
          project_id: projectId,
          agent_type: "EXPERIMENT_DESIGNER",
          status: "SUCCEEDED",
          input_hash: `gap:${gapId}`,
          model_provider: "openai",
          model_name: model,
          completed_at: new Date().toISOString(),
        })
        .select("id")
        .maybeSingle();

      if (run?.id) {
        await admin.from("ai_artifacts").insert({
          ai_run_id: run.id,
          artifact_type: "EXPERIMENT_DRAFT",
          content_json: draft,
          version: 1,
        });
      }
    }

    return NextResponse.json({ experiment: draft });
  } catch {
    return NextResponse.json({ error: "experiment_generation_failed" }, { status: 502 });
  }
}
