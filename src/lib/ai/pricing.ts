export type AiUsage = {
  inputTokens: number | null;
  cachedInputTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
};

type Price = {
  inputPerMillion: number;
  cachedInputPerMillion: number;
  outputPerMillion: number;
};

const STANDARD_USD_PRICING: Record<string, Price> = {
  "gpt-5.6-luna": {
    inputPerMillion: 0.2,
    cachedInputPerMillion: 0.02,
    outputPerMillion: 1.2,
  },
  "gpt-5.6-terra": {
    inputPerMillion: 2,
    cachedInputPerMillion: 0.2,
    outputPerMillion: 12,
  },
  "gpt-5.6-sol": {
    inputPerMillion: 4,
    cachedInputPerMillion: 0.4,
    outputPerMillion: 20,
  },
};

export const AI_PRICING_VERSION = "openai-standard-2026-09-26";

export function estimateOpenAiCostUsd(model: string, usage: AiUsage) {
  const price = STANDARD_USD_PRICING[model];
  if (!price || usage.inputTokens == null || usage.outputTokens == null) return null;

  const cached = Math.max(0, Math.min(usage.cachedInputTokens ?? 0, usage.inputTokens));
  const uncached = Math.max(0, usage.inputTokens - cached);
  const longContext = usage.inputTokens > 272_000;
  const inputMultiplier = longContext ? 2 : 1;
  const outputMultiplier = longContext ? 1.5 : 1;

  const cost =
    (uncached * price.inputPerMillion * inputMultiplier +
      cached * price.cachedInputPerMillion * inputMultiplier +
      usage.outputTokens * price.outputPerMillion * outputMultiplier) /
    1_000_000;

  return Number(cost.toFixed(8));
}
