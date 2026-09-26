import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { critiqueExperiment } from "@/lib/experiments/critic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ projectId: string; experimentId: string }> },
) {
  const { projectId, experimentId } = await context.params;
  const supabase = await createClient();

  const [project, problem, experiment, gap, claims] = await Promise.all([
    supabase.from("projects").select("id,workspace_id,title,current_stage").eq("id", projectId).maybeSingle(),
    supabase.from("project_problems").select("problem_statement,context,affected_users,current_solution_direction").eq("project_id", projectId).maybeSingle(),
    supabase.from("experiments").select("*").eq("project_id", projectId).eq("id", experimentId).maybeSingle(),
    Promise.resolve({ data: null as Record<string, unknown> | null }),
    supabase.from("claims").select("statement,claim_type,status").eq("project_id", projectId).limit(20),
  ]);

  if (!project.data || !experiment.data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let relatedGap = gap.data;
  if (experiment.data.gap_id) {
    const exactGap = await supabase
      .from("gaps")
      .select("id,title,description,gap_type,status,assumptions_json,validation_questions_json")
      .eq("project_id", projectId)
      .eq("id", experiment.data.gap_id)
      .maybeSingle();
    relatedGap = exactGap.data;
  }

  try {
    const review = await critiqueExperiment({
      project: project.data,
      problem: problem.data,
      gap: relatedGap,
      experiment: experiment.data,
      claims: claims.data ?? [],
    });

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "server_telemetry_unavailable" }, { status: 503 });
    }

    const model = process.env.OPENAI_SCIENTIFIC_CRITIC_MODEL ?? "gpt-5.6-sol";

    const { data: saved, error: saveError } = await admin
      .from("experiment_reviews")
      .insert({
        experiment_id: experimentId,
        review_type: "SCIENTIFIC_CRITIC",
        issues_json: review.issues,
        recommendations_json: review.recommendations,
        blocking_issues_json: review.blocking_issues,
        model_metadata_json: {
          provider: "openai",
          model,
          critic_version: "SCIENTIFIC_CRITIC_V1",
        },
      })
      .select("id")
      .single();

    if (saveError || !saved) {
      return NextResponse.json({ error: "review_save_failed" }, { status: 500 });
    }

    const { data: run } = await admin
      .from("ai_runs")
      .insert({
        workspace_id: project.data.workspace_id,
        project_id: projectId,
        agent_type: "SCIENTIFIC_CRITIC",
        status: "SUCCEEDED",
        input_hash: `experiment:${experimentId}`,
        model_provider: "openai",
        model_name: model,
        completed_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();

    if (run?.id) {
      await admin.from("ai_artifacts").insert({
        ai_run_id: run.id,
        artifact_type: "EXPERIMENT_REVIEW",
        content_json: review,
        version: 1,
      });
    }

    return NextResponse.json({ review_id: saved.id, review });
  } catch {
    return NextResponse.json({ error: "critic_failed" }, { status: 502 });
  }
}
