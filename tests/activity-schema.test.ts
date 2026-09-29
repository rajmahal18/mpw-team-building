import { describe, expect, it } from "vitest";
import { ActivityDefinitionSchema } from "@/schemas/activity";
import { createStarterDefinition } from "@/domain/activity/starter-definition";

function definitionWithChoices(count: number) {
  const base = createStarterDefinition("quiz-like", "Organizer Authored Knowledge Task");
  return {
    ...base,
    content: [{
      id: "q1",
      type: "single_select",
      prompt: { default: "Organizer-authored question" },
      choices: Array.from({ length: count }, (_, i) => ({ id: `c${i + 1}`, label: { default: `Choice ${i + 1}` } })),
      validation: { correctChoiceIds: ["c1"] },
      required: true,
    }],
  };
}

describe("ActivityDefinitionSchema", () => {
  it.each([2, 3, 7, 15])("accepts single-select with %i choices", (count) => {
    expect(ActivityDefinitionSchema.safeParse(definitionWithChoices(count)).success).toBe(true);
  });

  it("supports non-scored activities", () => {
    const definition = createStarterDefinition("reflection", "Reflection");
    expect(ActivityDefinitionSchema.parse(definition).scoring).toBeUndefined();
  });

  it("rejects duplicate block IDs", () => {
    const base = createStarterDefinition("duplicate", "Duplicate");
    expect(ActivityDefinitionSchema.safeParse({ ...base, content: [base.content[0], base.content[0]] }).success).toBe(false);
  });

  it("supports the same judge-rubric primitive for materially different creative tasks", () => {
    const rubric = {
      id: "judging",
      type: "judge_rubric",
      rubricKey: "creative",
      criteria: [
        { id: "teamwork", label: { default: "Teamwork" }, weight: 1, scale: { min: 1, max: 10 } },
        { id: "execution", label: { default: "Execution" }, weight: 2, scale: { min: 1, max: 10 } },
      ],
      aggregateJudges: "AVERAGE",
      required: true,
    } as const;
    for (const [key, title] of [["team-chant", "Team Chant"], ["poster-presentation", "Poster Presentation"]] as const) {
      const base = createStarterDefinition(key, title);
      expect(ActivityDefinitionSchema.safeParse({ ...base, content: [rubric] }).success).toBe(true);
    }
  });
});
