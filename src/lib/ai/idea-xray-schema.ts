export type IdeaXRayResult = {
  project_title: string;
  problem: string;
  context: string;
  affected_users: string;
  proposed_direction: string;
  assumptions: string[];
  unknowns: string[];
  risks: string[];
  critical_questions: string[];
  suggested_search_directions: string[];
  next_best_action: {
    action: string;
    reason: string;
    blocking_issue: string | null;
  };
};

export const ideaXRayJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "project_title",
    "problem",
    "context",
    "affected_users",
    "proposed_direction",
    "assumptions",
    "unknowns",
    "risks",
    "critical_questions",
    "suggested_search_directions",
    "next_best_action",
  ],
  properties: {
    project_title: { type: "string", minLength: 3, maxLength: 180 },
    problem: { type: "string", minLength: 10, maxLength: 1200 },
    context: { type: "string", maxLength: 1200 },
    affected_users: { type: "string", maxLength: 700 },
    proposed_direction: { type: "string", maxLength: 1000 },
    assumptions: {
      type: "array",
      minItems: 1,
      maxItems: 10,
      items: { type: "string", minLength: 3, maxLength: 500 },
    },
    unknowns: {
      type: "array",
      minItems: 1,
      maxItems: 10,
      items: { type: "string", minLength: 3, maxLength: 500 },
    },
    risks: {
      type: "array",
      maxItems: 10,
      items: { type: "string", minLength: 3, maxLength: 500 },
    },
    critical_questions: {
      type: "array",
      minItems: 1,
      maxItems: 10,
      items: { type: "string", minLength: 3, maxLength: 500 },
    },
    suggested_search_directions: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: { type: "string", minLength: 3, maxLength: 500 },
    },
    next_best_action: {
      type: "object",
      additionalProperties: false,
      required: ["action", "reason", "blocking_issue"],
      properties: {
        action: { type: "string", minLength: 3, maxLength: 500 },
        reason: { type: "string", minLength: 3, maxLength: 700 },
        blocking_issue: {
          anyOf: [
            { type: "string", minLength: 3, maxLength: 500 },
            { type: "null" },
          ],
        },
      },
    },
  },
} as const;

export function isIdeaXRayResult(value: unknown): value is IdeaXRayResult {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  const stringFields = [
    "project_title",
    "problem",
    "context",
    "affected_users",
    "proposed_direction",
  ];

  if (stringFields.some((key) => typeof item[key] !== "string")) return false;

  const arrayFields = [
    "assumptions",
    "unknowns",
    "risks",
    "critical_questions",
    "suggested_search_directions",
  ];

  if (
    arrayFields.some(
      (key) =>
        !Array.isArray(item[key]) ||
        !(item[key] as unknown[]).every((entry) => typeof entry === "string"),
    )
  ) {
    return false;
  }

  const next = item.next_best_action;
  return Boolean(
    next &&
      typeof next === "object" &&
      typeof (next as Record<string, unknown>).action === "string" &&
      typeof (next as Record<string, unknown>).reason === "string" &&
      (typeof (next as Record<string, unknown>).blocking_issue === "string" ||
        (next as Record<string, unknown>).blocking_issue === null),
  );
}
