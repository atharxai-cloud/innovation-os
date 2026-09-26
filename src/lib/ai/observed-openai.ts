import { createAdminClient } from "@/lib/supabase/admin";
import { AI_PRICING_VERSION, estimateOpenAiCostUsd, type AiUsage } from "@/lib/ai/pricing";
import { logEvent } from "@/lib/observability/logger";
import { assertAiBudget } from "@/lib/ai/budget";
import { captureOperationalEvent } from "@/lib/ops/events";

export type AiObservationContext = {
  workspaceId?: string | null;
  projectId?: string | null;
  actorId?: string | null;
  agentType: string;
  inputHash: string;
  metadata?: Record<string, unknown>;
};

type ObservedRequest = {
  context: AiObservationContext;
  model: string;
  body: Record<string, unknown>;
  timeoutMs?: number;
  retries?: number;
};

type ResponsesPayload = {
  output?: unknown[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    input_tokens_details?: { cached_tokens?: number };
    output_tokens_details?: { reasoning_tokens?: number };
  };
  service_tier?: string;
  [key: string]: unknown;
};

function parseUsage(payload: ResponsesPayload): AiUsage {
  return {
    inputTokens: payload.usage?.input_tokens ?? null,
    cachedInputTokens: payload.usage?.input_tokens_details?.cached_tokens ?? null,
    outputTokens: payload.usage?.output_tokens ?? null,
    reasoningTokens: payload.usage?.output_tokens_details?.reasoning_tokens ?? null,
  };
}

function safeErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "unknown_error";
  return error.message.slice(0, 500);
}

export async function observedOpenAIResponse(input: ObservedRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");

  const endpoint = "https://api.openai.com/v1/responses";
  const startedAt = Date.now();

  await assertAiBudget({
    workspaceId: input.context.workspaceId,
    projectId: input.context.projectId,
    actorId: input.context.actorId,
    agentType: input.context.agentType,
  });

  const admin = createAdminClient();
  let runId: string | null = null;
  let preAuthRunId: string | null = null;

  if (admin && input.context.workspaceId) {
    const { data } = await admin
      .from("ai_runs")
      .insert({
        workspace_id: input.context.workspaceId,
        project_id: input.context.projectId ?? null,
        actor_id: input.context.actorId ?? null,
        agent_type: input.context.agentType,
        status: "RUNNING",
        input_hash: input.context.inputHash,
        model_provider: "openai",
        model_name: input.model,
        endpoint,
        pricing_version: AI_PRICING_VERSION,
        metadata_json: input.context.metadata ?? {},
      })
      .select("id")
      .maybeSingle();

    runId = data?.id ?? null;
  } else if (admin) {
    const { data } = await admin
      .from("ai_pre_auth_runs")
      .insert({
        agent_type: input.context.agentType,
        status: "RUNNING",
        input_hash: input.context.inputHash,
        model_provider: "openai",
        model_name: input.model,
        pricing_version: AI_PRICING_VERSION,
        metadata_json: input.context.metadata ?? {},
      })
      .select("id")
      .maybeSingle();

    preAuthRunId = data?.id ?? null;
  }

  const telemetryId = runId ?? preAuthRunId;

  logEvent("info", "ai.request.started", {
    run_id: telemetryId,
    workspace_id: input.context.workspaceId ?? null,
    project_id: input.context.projectId ?? null,
    actor_id: input.context.actorId ?? null,
    agent_type: input.context.agentType,
    model: input.model,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? 30_000);

  try {
    let response: Response | null = null;
    const retries = Math.max(0, input.retries ?? 0);

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...input.body, model: input.model }),
        signal: controller.signal,
        cache: "no-store",
      });

      if (response.ok || ![429, 500, 502, 503, 504].includes(response.status)) break;
    }

    const requestId =
      response?.headers.get("x-request-id") ??
      response?.headers.get("openai-request-id") ??
      null;

    if (!response?.ok) {
      const status = response?.status ?? 0;
      throw new Error(`OpenAI request failed: ${status || "unknown"}`);
    }

    const payload = (await response.json()) as ResponsesPayload;
    const usage = parseUsage(payload);
    const durationMs = Date.now() - startedAt;
    const estimatedCost = estimateOpenAiCostUsd(input.model, usage);

    if (admin && runId) {
      await admin
        .from("ai_runs")
        .update({
          status: "SUCCEEDED",
          request_id: requestId,
          service_tier: payload.service_tier ?? null,
          tokens_in: usage.inputTokens,
          cached_input_tokens: usage.cachedInputTokens,
          tokens_out: usage.outputTokens,
          reasoning_tokens: usage.reasoningTokens,
          estimated_cost: estimatedCost,
          duration_ms: durationMs,
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId);
    } else if (admin && preAuthRunId) {
      await admin
        .from("ai_pre_auth_runs")
        .update({
          status: "SUCCEEDED",
          request_id: requestId,
          service_tier: payload.service_tier ?? null,
          tokens_in: usage.inputTokens,
          cached_input_tokens: usage.cachedInputTokens,
          tokens_out: usage.outputTokens,
          reasoning_tokens: usage.reasoningTokens,
          estimated_cost: estimatedCost,
          duration_ms: durationMs,
          completed_at: new Date().toISOString(),
        })
        .eq("id", preAuthRunId);
    }

    logEvent("info", "ai.request.succeeded", {
      run_id: telemetryId,
      request_id: requestId,
      workspace_id: input.context.workspaceId ?? null,
      project_id: input.context.projectId ?? null,
      actor_id: input.context.actorId ?? null,
      agent_type: input.context.agentType,
      model: input.model,
      duration_ms: durationMs,
      input_tokens: usage.inputTokens,
      cached_input_tokens: usage.cachedInputTokens,
      output_tokens: usage.outputTokens,
      reasoning_tokens: usage.reasoningTokens,
      estimated_cost_usd: estimatedCost,
    });

    return { payload, usage, runId, preAuthRunId, requestId, durationMs, estimatedCost };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const message = safeErrorMessage(error);

    if (admin && runId) {
      await admin
        .from("ai_runs")
        .update({
          status: "FAILED",
          duration_ms: durationMs,
          completed_at: new Date().toISOString(),
          error_code: error instanceof DOMException && error.name === "AbortError" ? "TIMEOUT" : "AI_REQUEST_FAILED",
          error_message: message,
        })
        .eq("id", runId);
    } else if (admin && preAuthRunId) {
      await admin
        .from("ai_pre_auth_runs")
        .update({
          status: "FAILED",
          duration_ms: durationMs,
          completed_at: new Date().toISOString(),
          error_code: error instanceof DOMException && error.name === "AbortError" ? "TIMEOUT" : "AI_REQUEST_FAILED",
          error_message: message,
        })
        .eq("id", preAuthRunId);
    }

    await captureOperationalEvent({
      severity: "ERROR",
      eventType: "ai.request.failed",
      source: "openai",
      workspaceId: input.context.workspaceId,
      projectId: input.context.projectId,
      actorId: input.context.actorId,
      message,
      metadata: {
        run_id: telemetryId,
        agent_type: input.context.agentType,
        model: input.model,
        duration_ms: durationMs,
      },
    });

    logEvent("error", "ai.request.failed", {
      run_id: telemetryId,
      workspace_id: input.context.workspaceId ?? null,
      project_id: input.context.projectId ?? null,
      actor_id: input.context.actorId ?? null,
      agent_type: input.context.agentType,
      model: input.model,
      duration_ms: durationMs,
      error: message,
    });

    throw error;
  } finally {
    clearTimeout(timer);
  }
}
