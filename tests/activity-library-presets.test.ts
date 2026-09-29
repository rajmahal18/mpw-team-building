import { describe, expect, it } from "vitest";
import { RECOMMENDED_ACTIVITY_LIBRARY, materializeTemplateDefinition } from "@/domain/activity/library-presets";
import { ActivityDefinitionSchema } from "@/schemas/activity";

describe("recommended activity library", () => {
  it("contains only unique template keys and valid generic definitions", () => {
    const keys = RECOMMENDED_ACTIVITY_LIBRARY.map((item) => item.machineKey);
    expect(new Set(keys).size).toBe(keys.length);
    for (const item of RECOMMENDED_ACTIVITY_LIBRARY) expect(ActivityDefinitionSchema.safeParse(item.definition).success).toBe(true);
  });

  it("does not encode a four-choice assumption in the quiz starter", () => {
    const quiz = RECOMMENDED_ACTIVITY_LIBRARY.find((item) => item.machineKey === "quiz-starter");
    expect(quiz).toBeTruthy();
    const question = quiz!.definition.content.find((block) => block.type === "single_select");
    expect(question?.type).toBe("single_select");
    if (question?.type === "single_select") expect(question.choices).toHaveLength(3);
  });

  it("materializes independent event-local identity", () => {
    const template = RECOMMENDED_ACTIVITY_LIBRARY[0];
    const copy = materializeTemplateDefinition(template.definition, { key: "custom-checkpoint-17", title: "Custom Checkpoint 17" });
    expect(copy.key).toBe("custom-checkpoint-17");
    expect(copy.title.default).toBe("Custom Checkpoint 17");
    expect(template.definition.key).not.toBe(copy.key);
  });
});
