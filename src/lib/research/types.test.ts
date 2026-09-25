import { describe, expect, it } from "vitest";
import type { EvidenceSearchResult } from "./types";

describe("EvidenceSearchResult contract", () => {
  it("supports canonical scholarly result fields", () => {
    const item: EvidenceSearchResult = {
      externalId: "https://openalex.org/W1",
      doi: "10.1234/example",
      title: "Example",
      authors: ["A. Author"],
      publishedAt: "2026-01-01",
      url: "https://doi.org/10.1234/example",
      abstract: "Abstract",
      citedByCount: 3,
      openAccess: true,
      provider: "OPENALEX",
    };

    expect(item.provider).toBe("OPENALEX");
    expect(item.doi).toContain("10.");
  });
});
