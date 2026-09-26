import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { AI_PRICING_VERSION } from "@/lib/ai/pricing";
import { logEvent } from "@/lib/observability/logger";
import type { IdeaXRayResult } from "@/lib/ai/idea-xray-schema";

export async function recordIdeaXRayConversion(input: {
  projectId: string;
  rawIdea: string;
  analysis: IdeaXRayResult;
  actorId?: string | null;
  preAuthRunId?: string | null;
}) {
  const admin = createAdminClient();

  if (!admin) {
    logEvent("warn", "ai.telemetry.skipped", {
      agent_type: "IDEA_XRAY",
      project_id: input.projectId,
      reason: "service_role_unavailable",
    });
    return;
  }

  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("workspace_id")
    .eq("id", input.projectId)
    .maybeSingle();

  if (projectError || !project) {
    logEvent("warn", "ai.telemetry.skipped", {
      agent_type: "IDEA_XRAY",
      project_id: input.projectId,
      reason: "project_workspace_lookup_failed",
    });
    return;
  }

  const expectedHash = createHash("sha256").update(input.rawIdea).digest("hex");
  let trusted:
    | {
        id: string;
        input_hash: string;
        model_name: string;
        request_id: string | null;
        service_tier: string | null;
        tokens_in: number | null;
        cached_input_tokens: number | null;
        tokens_out: number | null;
        reasoning_tokens: number | null;
        estimated_cost: number | null;
        duration_ms: number | null;
        pricing_version: string | null;
        metadata_json: Record<string, unknown> | null;
      }
    | null = null;

  if (input.preAuthRunId) {
    const { data } = await admin
      .from("ai_pre_auth_runs")
      .select(
        "id,input_hash,model_name,request_id,service_tier,tokens_in,cached_input_tokens,tokens_out,reasoning_tokens,estimated_cost,duration_ms,pricing_version,metadata_json",
      )
      .eq("id", input.preAuthRunId)
      .eq("agent_type", "IDEA_XRAY")
      .eq("status", "SUCCEEDED")
      .is("claimed_at", null)
      .maybeSingle();

    if (data && data.input_hash === expectedHash) {
      trusted = data as typeof trusted;
    } else {
      logEvent("warn", "ai.pre_auth.claim_rejected", {
        project_id: input.projectId,
        pre_auth_run_id: input.preAuthRunId,
        reason: data ? "input_hash_mismatch" : "run_missing_or_claimed",
      });
    }
  }

  const { data: run, error: runError } = await admin
    .from("ai_runs")
    .insert({
      workspace_id: project.workspace_id,
      project_id: input.projectId,
      actor_id: input.actorId ?? null,
      agent_type: "IDEA_XRAY",
      status: "SUCCEEDED",
      input_hash: expectedHash,
      model_provider: "openai",
      model_name:
        trusted?.model_name ??
        process.env.OPENAI_IDEA_XRAY_MODEL ??
        "gpt-5.6-luna",
      request_id: trusted?.request_id ?? null,
      service_tier: trusted?.service_tier ?? null,
      tokens_in: trusted?.tokens_in ?? null,
      cached_input_tokens: trusted?.cached_input_tokens ?? null,
      tokens_out: trusted?.tokens_out ?? null,
      reasoning_tokens: trusted?.reasoning_tokens ?? null,
      estimated_cost: trusted?.estimated_cost ?? null,
      duration_ms: trusted?.duration_ms ?? null,
      pricing_version: trusted?.pricing_version ?? AI_PRICING_VERSION,
      metadata_json: {
        ...(trusted?.metadata_json ?? {}),
        telemetry_source: trusted ? "PRE_AUTH_CLAIM" : "LEGACY_CONVERSION",
      },
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (runError || !run) {
    logEvent("error", "ai.telemetry.persist_failed", {
      agent_type: "IDEA_XRAY",
      project_id: input.projectId,
      reason: "ai_run_insert_failed",
    });
    return;
  }

  const { error: artifactError } = await admin.from("ai_artifacts").insert({
    ai_run_id: run.id,
    artifact_type: "IDEA_XRAY_RESULT",
    content_json: input.analysis,
    version: 1,
  });

  if (artifactError) {
    logEvent("warn", "ai.telemetry.artifact_failed", {
      run_id: run.id,
      project_id: input.projectId,
      artifact_type: "IDEA_XRAY_RESULT",
    });
  }

  if (trusted) {
    await admin
      .from("ai_pre_auth_runs")
      .update({ claimed_at: new Date().toISOString() })
      .eq("id", trusted.id)
      .is("claimed_at", null);
  }

  logEvent("info", "ai.pre_auth.claimed", {
    run_id: run.id,
    pre_auth_run_id: trusted?.id ?? null,
    workspace_id: project.workspace_id,
    project_id: input.projectId,
    actor_id: input.actorId ?? null,
    agent_type: "IDEA_XRAY",
  });
}
