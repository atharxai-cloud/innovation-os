import { describe, expect, it } from "vitest";
import type { GapCandidate } from "./types";

describe("GapCandidate contract", () => {
  it("keeps gap hypotheses unvalidated and grounded by ids", () => {
    const gap: GapCandidate = {
      title: "Context gap",
      description: "Potential gap in a different operating context.",
      gap_type: "CONTEXT",
      known_limitation: "Existing work targets another context.",
      opportunity_rationale: "Different constraints may create a useful opportunity.",
      assumptions: ["Context changes constraints"],
      validation_questions: ["Are constraints materially different?"],
      confidence: 0.7,
      evidence_source_ids: ["source-1"],
      prior_art_ids: ["prior-1"],
    };

    expect(gap.evidence_source_ids.length).toBeGreaterThan(0);
    expect(gap.prior_art_ids.length).toBeGreaterThan(0);
    expect(gap.confidence).toBeLessThanOrEqual(1);
  });
});
