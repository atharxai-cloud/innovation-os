import { describe, expect, it } from "vitest";
import { parseProjectBrainSnapshot } from "./brain";

describe("Project Brain snapshot parser", () => {
  it("parses a persisted navigator snapshot", () => {
    const parsed = parseProjectBrainSnapshot({
      id: "snapshot-1",
      snapshot_version: 3,
      stage: "EVIDENCE",
      summary_json: {
        biggest_unknown: "هل توجد أدلة كافية؟",
      },
      next_best_action_json: {
        action: "ابحث عن مصادر موثوقة",
        reason: "الادعاء غير مدعوم بعد",
        blocking_issue: "نقص الأدلة",
        confidence: 0.91,
        generated_by: "DETERMINISTIC_NAVIGATOR_V1",
      },
      created_at: "2026-09-26T00:00:00Z",
    });

    expect(parsed.snapshotVersion).toBe(3);
    expect(parsed.biggestUnknown).toBe("هل توجد أدلة كافية؟");
    expect(parsed.nextAction.confidence).toBe(0.91);
    expect(parsed.generatedBy).toBe("DETERMINISTIC_NAVIGATOR_V1");
  });

  it("falls back safely when JSON fields are incomplete", () => {
    const parsed = parseProjectBrainSnapshot({
      id: "snapshot-2",
      snapshot_version: 1,
      stage: "DISCOVERY",
      summary_json: {},
      next_best_action_json: {},
      created_at: "2026-09-26T00:00:00Z",
    });

    expect(parsed.biggestUnknown).toBeNull();
    expect(parsed.nextAction.action.length).toBeGreaterThan(0);
    expect(parsed.nextAction.confidence).toBeNull();
  });
});
