import { createAdminClient } from "@/lib/supabase/admin";
import { captureOperationalEvent } from "@/lib/ops/events";

const PRE_AUTH_DAILY_LIMIT_USD = Number(
  process.env.AI_PREAUTH_DAILY_BUDGET_USD ?? "5",
);

export async function assertAiBudget(input: {
  workspaceId?: string | null;
  projectId?: string | null;
  actorId?: string | null;
  agentType: string;
}) {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error("AI_BUDGET_CHECK_UNAVAILABLE");
  }

  if (input.workspaceId) {
    const { data, error } = await admin.rpc("get_workspace_ai_budget_status", {
      p_workspace_id: input.workspaceId,
    });

    if (error || !Array.isArray(data) || !data[0]) {
      await captureOperationalEvent({
        severity: "ERROR",
        eventType: "ai.budget.check_failed",
        source: "ai-budget",
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        actorId: input.actorId,
        message: "Workspace AI budget check failed.",
        metadata: { agent_type: input.agentType },
      });
      throw new Error("AI_BUDGET_CHECK_UNAVAILABLE");
    }

    const row = data[0] as {
      spend_usd: number | string;
      limit_usd: number | string;
      warning_ratio: number | string;
      hard_stop: boolean;
      allowed: boolean;
    };

    const spend = Number(row.spend_usd);
    const limit = Number(row.limit_usd);
    const warningRatio = Number(row.warning_ratio);
    const ratio = limit > 0 ? spend / limit : 1;

    if (ratio >= warningRatio && row.allowed) {
      await captureOperationalEvent({
        severity: "WARNING",
        eventType: "ai.budget.warning",
        source: "ai-budget",
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        actorId: input.actorId,
        message: "Workspace AI spend crossed the warning threshold.",
        metadata: {
          agent_type: input.agentType,
          spend_usd: spend,
          limit_usd: limit,
          utilization_ratio: ratio,
        },
      });
    }

    if (!row.allowed) {
      await captureOperationalEvent({
        severity: "ERROR",
        eventType: "ai.budget.blocked",
        source: "ai-budget",
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        actorId: input.actorId,
        message: "Workspace AI monthly budget has been reached.",
        metadata: {
          agent_type: input.agentType,
          spend_usd: spend,
          limit_usd: limit,
        },
      });
      throw new Error("AI_BUDGET_EXCEEDED");
    }

    return;
  }

  const { data, error } = await admin.rpc("get_pre_auth_ai_daily_spend");

  if (error) {
    await captureOperationalEvent({
      severity: "ERROR",
      eventType: "ai.preauth_budget.check_failed",
      source: "ai-budget",
      message: "Pre-auth AI budget check failed.",
      metadata: { agent_type: input.agentType },
    });
    throw new Error("AI_BUDGET_CHECK_UNAVAILABLE");
  }

  const spend = Number(data ?? 0);
  const limit = Number.isFinite(PRE_AUTH_DAILY_LIMIT_USD)
    ? PRE_AUTH_DAILY_LIMIT_USD
    : 5;

  if (spend >= limit) {
    await captureOperationalEvent({
      severity: "ERROR",
      eventType: "ai.preauth_budget.blocked",
      source: "ai-budget",
      message: "Pre-auth AI daily budget has been reached.",
      metadata: {
        agent_type: input.agentType,
        spend_usd: spend,
        limit_usd: limit,
      },
    });
    throw new Error("AI_BUDGET_EXCEEDED");
  }

  if (limit > 0 && spend / limit >= 0.8) {
    await captureOperationalEvent({
      severity: "WARNING",
      eventType: "ai.preauth_budget.warning",
      source: "ai-budget",
      message: "Pre-auth AI daily spend crossed 80%.",
      metadata: {
        agent_type: input.agentType,
        spend_usd: spend,
        limit_usd: limit,
      },
    });
  }
}
