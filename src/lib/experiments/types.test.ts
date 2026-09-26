import { describe, expect, it } from "vitest";
import type { ExperimentDraft, ScientificCriticReview } from "./types";

describe("Experiment workflow contracts", () => {
  it("requires an explicit testable design", () => {
    const draft: ExperimentDraft = {
      title: "Experiment",
      research_question: "Does X change Y under controlled conditions?",
      hypothesis: "X increases Y relative to control.",
      independent_variable: "X",
      dependent_variable: "Y",
      control_description: "No X",
      sample_description: "Comparable samples",
      measurement_method: "Same instrument",
      protocol: ["Baseline", "Apply X", "Measure Y"],
      success_criteria: "Repeatable increase relative to control",
      expected_failure_modes: ["Measurement drift"],
      safety_notes: ["Follow laboratory safety rules"],
    };

    expect(draft.protocol.length).toBeGreaterThan(1);
    expect(draft.success_criteria.length).toBeGreaterThan(5);
  });

  it("distinguishes blocking critic issues", () => {
    const review: ScientificCriticReview = {
      summary: "Control is insufficient.",
      issues: [
        { category: "CONTROL", severity: "BLOCKING", message: "Control is not defined." },
      ],
      recommendations: ["Define the control."],
      blocking_issues: ["Control is not defined."],
    };

    expect(review.blocking_issues).toHaveLength(1);
    expect(review.issues[0].severity).toBe("BLOCKING");
  });
});
