import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { IdeaXRayResult } from "@/lib/ai/idea-xray-schema";

export async function recordIdeaXRayConversion(input: {
  projectId: string;
  rawIdea: string;
  analysis: IdeaXRayResult;
}) {
  const admin = createAdminClient();

  if (!admin) {
    console.error("AI telemetry skipped: SUPABASE_SERVICE_ROLE_KEY is not configured");
    return;
  }

  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("workspace_id")
    .eq("id", input.projectId)
    .maybeSingle();

  if (projectError || !project) {
    console.error("AI telemetry skipped: project workspace lookup failed");
    return;
  }

  const { data: run, error: runError } = await admin
    .from("ai_runs")
    .insert({
      workspace_id: project.workspace_id,
      project_id: input.projectId,
      agent_type: "IDEA_XRAY",
      status: "SUCCEEDED",
      input_hash: createHash("sha256").update(input.rawIdea).digest("hex"),
      model_provider: "openai",
      model_name: process.env.OPENAI_IDEA_XRAY_MODEL ?? "gpt-5.6-luna",
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (runError || !run) {
    console.error("AI telemetry skipped: ai_run insert failed");
    return;
  }

  const { error: artifactError } = await admin.from("ai_artifacts").insert({
    ai_run_id: run.id,
    artifact_type: "IDEA_XRAY_RESULT",
    content_json: input.analysis,
    version: 1,
  });

  if (artifactError) {
    console.error("AI telemetry incomplete: ai_artifact insert failed");
  }
}
