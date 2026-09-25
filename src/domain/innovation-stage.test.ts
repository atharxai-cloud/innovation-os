import { describe, expect, it } from "vitest";
import { canTransition, nextStage } from "./innovation-stage";

describe("innovation stage model", () => {
  it("allows only the next MVP stage", () => {
    expect(canTransition("DISCOVERY", "PROBLEM_VALIDATION")).toBe(true);
    expect(canTransition("DISCOVERY", "EVIDENCE")).toBe(false);
  });

  it("has no next stage after EXPERIMENT_READY", () => {
    expect(nextStage("EXPERIMENT_READY")).toBeNull();
  });
});
