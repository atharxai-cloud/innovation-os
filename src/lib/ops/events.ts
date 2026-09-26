import { createAdminClient } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/observability/logger";

export type OpsSeverity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";

export async function captureOperationalEvent(input: {
  severity: OpsSeverity;
  eventType: string;
  source: string;
  message: string;
  workspaceId?: string | null;
  projectId?: string | null;
  actorId?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const level =
    input.severity === "CRITICAL" || input.severity === "ERROR"
      ? "error"
      : input.severity === "WARNING"
        ? "warn"
        : "info";

  logEvent(level, input.eventType, {
    source: input.source,
    workspace_id: input.workspaceId ?? null,
    project_id: input.projectId ?? null,
    actor_id: input.actorId ?? null,
    request_id: input.requestId ?? null,
    message: input.message,
    ...(input.metadata ?? {}),
  });

  const admin = createAdminClient();
  if (!admin) return;

  await admin.from("operational_events").insert({
    severity: input.severity,
    event_type: input.eventType,
    source: input.source,
    workspace_id: input.workspaceId ?? null,
    project_id: input.projectId ?? null,
    actor_id: input.actorId ?? null,
    request_id: input.requestId ?? null,
    message: input.message.slice(0, 1500),
    metadata_json: input.metadata ?? {},
  });
}
