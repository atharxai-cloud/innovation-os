import { describe, expect, it } from "vitest";
import { estimateOpenAiCostUsd } from "./pricing";

describe("estimateOpenAiCostUsd", () => {
  it("calculates Luna standard token cost", () => {
    expect(
      estimateOpenAiCostUsd("gpt-5.6-luna", {
        inputTokens: 100_000,
        cachedInputTokens: 0,
        outputTokens: 100_000,
        reasoningTokens: 0,
      }),
    ).toBe(0.14);
  });

  it("uses cached-input pricing only for cached input tokens", () => {
    expect(
      estimateOpenAiCostUsd("gpt-5.6-terra", {
        inputTokens: 200_000,
        cachedInputTokens: 100_000,
        outputTokens: 100_000,
        reasoningTokens: 20_000,
      }),
    ).toBe(1.42);
  });

  it("does not double-charge reasoning tokens outside output tokens", () => {
    expect(
      estimateOpenAiCostUsd("gpt-5.6-sol", {
        inputTokens: 100_000,
        cachedInputTokens: 0,
        outputTokens: 50_000,
        reasoningTokens: 40_000,
      }),
    ).toBe(1.4);
  });

  it("applies the long-context multiplier above 272K input tokens", () => {
    expect(
      estimateOpenAiCostUsd("gpt-5.6-luna", {
        inputTokens: 300_000,
        cachedInputTokens: 100_000,
        outputTokens: 100_000,
        reasoningTokens: 0,
      }),
    ).toBe(0.264);
  });

  it("returns null for unknown models or incomplete usage", () => {
    expect(
      estimateOpenAiCostUsd("unknown-model", {
        inputTokens: 10,
        cachedInputTokens: 0,
        outputTokens: 10,
        reasoningTokens: 0,
      }),
    ).toBeNull();

    expect(
      estimateOpenAiCostUsd("gpt-5.6-luna", {
        inputTokens: null,
        cachedInputTokens: null,
        outputTokens: 10,
        reasoningTokens: null,
      }),
    ).toBeNull();
  });
});
