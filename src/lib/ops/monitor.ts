import { createAdminClient } from "@/lib/supabase/admin";
import { captureOperationalEvent } from "@/lib/ops/events";
import { logEvent } from "@/lib/observability/logger";

const ALERT_COOLDOWN_MS = 30 * 60 * 1000;

async function deliverAlert(
  alertKey: string,
  message: string,
  metadata: Record<string, unknown>,
) {
  const admin = createAdminClient();
  if (!admin) return false;

  const { data: state } = await admin
    .from("ops_alert_state")
    .select("last_notified_at")
    .eq("alert_key", alertKey)
    .maybeSingle();

  if (
    state?.last_notified_at &&
    Date.now() - new Date(state.last_notified_at).getTime() < ALERT_COOLDOWN_MS
  ) {
    return false;
  }

  await captureOperationalEvent({
    severity: "CRITICAL",
    eventType: "ops.alert",
    source: "ops-monitor",
    message,
    metadata: { alert_key: alertKey, ...metadata },
  });

  const webhook = process.env.OPS_ALERT_WEBHOOK_URL;
  let delivered = false;

  if (webhook) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);

    try {
      const response = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: "innovation-os",
          alert: alertKey,
          message,
          metadata,
          timestamp: new Date().toISOString(),
        }),
        signal: controller.signal,
        cache: "no-store",
      });
      delivered = response.ok;
    } catch {
      delivered = false;
    } finally {
      clearTimeout(timer);
    }
  } else {
    logEvent("warn", "ops.alert.webhook_not_configured", {
      alert_key: alertKey,
    });
  }

  await admin.from("ops_alert_state").upsert({
    alert_key: alertKey,
    last_notified_at: new Date().toISOString(),
    last_payload_json: { message, metadata, webhook_delivered: delivered },
    updated_at: new Date().toISOString(),
  });

  return true;
}

export async function runOperationalMonitor() {
  const admin = createAdminClient();
  if (!admin) throw new Error("SERVICE_ROLE_UNAVAILABLE");

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const [failedJobs, failedAi, stuckJobs, budgets] = await Promise.all([
    admin
      .from("background_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "FAILED")
      .gte("completed_at", tenMinutesAgo),
    admin
      .from("ai_runs")
      .select("id", { count: "exact", head: true })
      .eq("status", "FAILED")
      .gte("completed_at", tenMinutesAgo),
    admin
      .from("background_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "QUEUED")
      .lt("created_at", fiveMinutesAgo),
    admin.rpc("get_ai_budget_alerts"),
  ]);

  const failedJobCount = failedJobs.count ?? 0;
  const failedAiCount = failedAi.count ?? 0;
  const stuckJobCount = stuckJobs.count ?? 0;

  if (failedJobCount >= 3) {
    await deliverAlert(
      "background_jobs_failure_spike",
      "Background job failures reached the operational threshold.",
      { failed_jobs_10m: failedJobCount },
    );
  }

  if (failedAiCount >= 5) {
    await deliverAlert(
      "ai_failure_spike",
      "AI request failures reached the operational threshold.",
      { failed_ai_runs_10m: failedAiCount },
    );
  }

  if (stuckJobCount >= 1) {
    await deliverAlert(
      "background_jobs_stuck",
      "One or more background jobs have remained queued for over five minutes.",
      { stuck_jobs: stuckJobCount },
    );
  }

  for (const row of Array.isArray(budgets.data) ? budgets.data : []) {
    const workspaceId =
      typeof row.workspace_id === "string" ? row.workspace_id : "unknown";
    const ratio = Number(row.utilization_ratio ?? 0);

    await deliverAlert(
      `ai_budget_${workspaceId}`,
      ratio >= 1
        ? "Workspace AI budget has been exhausted."
        : "Workspace AI budget crossed the warning threshold.",
      {
        workspace_id: workspaceId,
        spend_usd: Number(row.spend_usd ?? 0),
        limit_usd: Number(row.limit_usd ?? 0),
        utilization_ratio: ratio,
      },
    );
  }

  const cleanup = await admin.rpc("cleanup_operational_data");

  return {
    failed_jobs_10m: failedJobCount,
    failed_ai_runs_10m: failedAiCount,
    stuck_jobs: stuckJobCount,
    budget_alerts: Array.isArray(budgets.data) ? budgets.data.length : 0,
    cleanup: cleanup.data ?? null,
  };
}
