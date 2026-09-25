import { describe, expect, it } from "vitest";
import { isIdeaXRayResult } from "./idea-xray-schema";

const valid = {
  project_title: "ترشيد تشغيل التكييف",
  problem: "تشغيل التكييف في الفصول الفارغة يسبب هدراً محتملاً في الطاقة.",
  context: "الفصول الدراسية",
  affected_users: "المدارس وإدارة المرافق",
  proposed_direction: "تحكم يعتمد على الإشغال",
  assumptions: ["يوجد هدر قابل للقياس"],
  unknowns: ["حجم الهدر"],
  risks: ["تكلفة التطبيق"],
  critical_questions: ["ما مقدار استهلاك الطاقة؟"],
  suggested_search_directions: ["classroom HVAC occupancy energy waste"],
  next_best_action: {
    action: "قياس خط أساس",
    reason: "إثبات حجم المشكلة يسبق بناء الحل",
    blocking_issue: "حجم الهدر غير معروف",
  },
};

describe("Idea X-Ray schema validation", () => {
  it("accepts a complete structured result", () => {
    expect(isIdeaXRayResult(valid)).toBe(true);
  });

  it("rejects missing structured fields", () => {
    expect(isIdeaXRayResult({ ...valid, assumptions: "not-an-array" })).toBe(false);
  });

  it("rejects malformed next action", () => {
    expect(
      isIdeaXRayResult({
        ...valid,
        next_best_action: { action: "x" },
      }),
    ).toBe(false);
  });
});
