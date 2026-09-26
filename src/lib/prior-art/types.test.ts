import { describe, expect, it } from "vitest";
import type { PriorArtComparison, PriorArtSearchResult } from "./types";

describe("Prior-Art contracts", () => {
  it("supports patent discovery records", () => {
    const item: PriorArtSearchResult = {
      provider: "EPO_OPS",
      priorArtType: "PATENT",
      externalId: "EP.1234567.A1",
      title: "Example Patent",
      authors: [],
      publishedAt: "2025-01-01",
      doi: null,
      url: "https://worldwide.espacenet.com/",
      abstract: null,
      metadata: { country: "EP" },
    };

    expect(item.priorArtType).toBe("PATENT");
  });

  it("uses conceptual similarity without legal verdicts", () => {
    const comparison: PriorArtComparison = {
      technical_summary: "Technical summary",
      similarity_level: "MEDIUM",
      similarity_reasons: ["shared mechanism"],
      shared_concepts: ["sensor"],
      key_differences: ["different context"],
      limitations: ["metadata only"],
      disclaimer: "Conceptual comparison only.",
    };

    expect(["LOW","MEDIUM","HIGH"]).toContain(comparison.similarity_level);
    expect(comparison.disclaimer).toContain("Conceptual");
  });
});
