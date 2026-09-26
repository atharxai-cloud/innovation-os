export type IdeaXRayTelemetry = {
  runId: string | null;
  model: string;
  inputHash: string;
  usage: {
    inputTokens: number | null;
    cachedInputTokens: number | null;
    outputTokens: number | null;
    reasoningTokens: number | null;
  };
  requestId: string | null;
  durationMs: number;
  estimatedCostUsd: number | null;
};
