import type { NextBestAction } from "@/domain/project";

export type ProjectBrainSnapshot = {
  id: string;
  snapshotVersion: number;
  stage: string;
  createdAt: string;
  biggestUnknown: string | null;
  nextAction: NextBestAction;
  generatedBy: string;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

export function parseProjectBrainSnapshot(input: {
  id: string;
  snapshot_version: number;
  stage: string;
  summary_json: unknown;
  next_best_action_json: unknown;
  created_at: string;
}): ProjectBrainSnapshot {
  const summary = asObject(input.summary_json);
  const next = asObject(input.next_best_action_json);

  return {
    id: input.id,
    snapshotVersion: input.snapshot_version,
    stage: input.stage,
    createdAt: input.created_at,
    biggestUnknown:
      typeof summary.biggest_unknown === "string"
        ? summary.biggest_unknown
        : null,
    generatedBy:
      typeof next.generated_by === "string"
        ? next.generated_by
        : "UNKNOWN",
    nextAction: {
      action:
        typeof next.action === "string"
          ? next.action
          : "راجع حالة المشروع وحدد الخطوة التالية.",
      reason:
        typeof next.reason === "string"
          ? next.reason
          : "لا يتوفر تفسير محفوظ لهذه التوصية.",
      blockingIssue:
        typeof next.blocking_issue === "string"
          ? next.blocking_issue
          : null,
      confidence:
        typeof next.confidence === "number"
          ? next.confidence
          : null,
    },
  };
}
