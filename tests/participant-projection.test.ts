import { describe, expect, it } from "vitest";
import { ActivityBlockSchema } from "@/schemas/activity";
import { participantProjection } from "@/engine/blocks/registry";

describe("participant projection", () => {
  it("never exposes single-select answer keys", () => {
    const block = ActivityBlockSchema.parse({
      id: "q1", type: "single_select", prompt: { default: "Question" },
      choices: [{ id: "a", label: { default: "A" } }, { id: "b", label: { default: "B" } }],
      validation: { correctChoiceIds: ["b"] },
    });
    const safe = participantProjection(block);
    expect(JSON.stringify(safe)).not.toContain("correctChoiceIds");
    expect(JSON.stringify(safe)).not.toContain('"validation"');
  });

  it("removes protected text matchers", () => {
    const block = ActivityBlockSchema.parse({
      id: "fill", type: "fill_blank", prompt: { default: "Complete it" },
      matcher: { type: "EXACT", accepted: ["secret answer"], normalization: { trim: true, collapseWhitespace: true, caseSensitive: false } },
    });
    expect(JSON.stringify(participantProjection(block))).not.toContain("secret answer");
  });
});
