import { describe, expect, it } from "vitest";
import { detectIntent } from "./intent";

describe("Ask My Project intent routing", () => {
  it("routes evidence questions to evidence context", () => {
    expect(detectIntent("ما الادعاءات التي ما زالت بلا دليل؟")).toBe("EVIDENCE");
  });

  it("routes prior-art questions to prior-art context", () => {
    expect(detectIntent("ما الفرق بين الحل الحالي والأعمال السابقة؟")).toBe("PRIOR_ART");
  });

  it("routes experiment questions to experiment context", () => {
    expect(detectIntent("هل التجربة لديها control صالح؟")).toBe("EXPERIMENT");
  });

  it("falls back to general context", () => {
    expect(detectIntent("ماذا أثبتنا حتى الآن؟")).toBe("GENERAL");
  });
});
