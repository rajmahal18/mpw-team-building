import { describe, expect, it } from "vitest";
import { ActivityDefinitionSchema, QuestionBlockSchema } from "@/schemas/activity";
import { createStarterDefinition } from "@/domain/activity/starter-definition";
import { gradeBlockSubmission } from "@/engine/grading/grade-block";
import { participantActivityProjection } from "@/engine/blocks/registry";
import { preflightActivity } from "@/engine/validation/activity-preflight";

const norm = { trim: true, collapseWhitespace: true, caseSensitive: false, ignorePunctuation: true, unicodeNormalization: "NFKC" as const };

describe("Phase 5 content contracts", () => {
  it("supports a random question bank with mixed question types and arbitrary choices", () => {
    const base = createStarterDefinition("knowledge-station", "Knowledge Station");
    const definition = {
      ...base,
      content: [{
        id: "bank",
        type: "question_pool",
        mode: "RANDOM_N",
        drawCount: 2,
        shuffleSelected: true,
        questions: [
          { id: "q1", type: "single_select", prompt: { default: "Pick one" }, choices: Array.from({ length: 7 }, (_, i) => ({ id: `c${i}`, label: { default: `Choice ${i}` } })), validation: { correctChoiceIds: ["c3"] } },
          { id: "q2", type: "fill_blank", prompt: { default: "Fill it" }, matcher: { type: "EXACT", accepted: ["BARMM", "Bangsamoro Autonomous Region in Muslim Mindanao"], normalization: norm } },
          { id: "q3", type: "number_input", prompt: { default: "How many?" }, acceptance: { type: "ABS_TOLERANCE", target: 100, tolerance: 2 } },
        ],
      }],
    };
    expect(ActivityDefinitionSchema.safeParse(definition).success).toBe(true);
  });

  it("rejects a random draw larger than its bank", () => {
    const base = createStarterDefinition("bad-bank", "Bad Bank");
    const definition = { ...base, content: [{ id: "bank", type: "question_pool", mode: "RANDOM_N", drawCount: 3, shuffleSelected: true, questions: [{ id: "q1", type: "fill_blank", prompt: { default: "Q" }, matcher: { type: "EXACT", accepted: ["A"], normalization: norm } }] }] };
    expect(ActivityDefinitionSchema.safeParse(definition).success).toBe(false);
  });

  it("keeps unselected question-bank content out of participant projection by default", () => {
    const base = createStarterDefinition("secret-bank", "Secret Bank");
    const definition = ActivityDefinitionSchema.parse({ ...base, content: [{ id: "bank", type: "question_pool", mode: "RANDOM_N", drawCount: 1, shuffleSelected: true, questions: [
      { id: "q1", type: "fill_blank", prompt: { default: "Secret question one" }, matcher: { type: "EXACT", accepted: ["one"], normalization: norm } },
      { id: "q2", type: "fill_blank", prompt: { default: "Secret question two" }, matcher: { type: "EXACT", accepted: ["two"], normalization: norm } },
    ] }] });
    const hidden = participantActivityProjection(definition);
    expect(JSON.stringify(hidden)).not.toContain("Secret question one");
    const selected = participantActivityProjection(definition, { questionPools: { bank: ["q2"] } });
    expect(JSON.stringify(selected)).not.toContain("Secret question one");
    expect(JSON.stringify(selected)).toContain("Secret question two");
    expect(JSON.stringify(selected)).not.toContain('"accepted"');
  });

  it("preflight detects metric references created by activity blocks", () => {
    const base = createStarterDefinition("metric-task", "Metric Task");
    const result = preflightActivity({ ...base, content: [{ id: "result", type: "manual_metric", prompt: { default: "Record it" }, metricKey: "missing", required: true }] });
    expect(result.issues.some((issue) => issue.code === "UNKNOWN_METRIC")).toBe(true);
  });
});

describe("generic question auto-grading", () => {
  it("grades single-select without assuming four choices", () => {
    const block = QuestionBlockSchema.parse({ id: "q", type: "single_select", prompt: { default: "Pick" }, choices: Array.from({ length: 9 }, (_, i) => ({ id: `c${i}`, label: { default: String(i) } })), validation: { correctChoiceIds: ["c7"] }, grading: { correctPoints: 10, incorrectPoints: 0, partialCredit: "NONE" } });
    expect(gradeBlockSubmission(block, { choiceId: "c7" })).toMatchObject({ gradable: true, correct: true, earnedPoints: 10 });
  });

  it("normalizes organizer-authored fill-in accepted answers", () => {
    const block = QuestionBlockSchema.parse({ id: "q", type: "fill_blank", prompt: { default: "Region" }, matcher: { type: "EXACT", accepted: ["BARMM"], normalization: norm } });
    expect(gradeBlockSubmission(block, { value: "  barmm!!! " })).toMatchObject({ gradable: true, correct: true });
  });

  it("supports proportional multi-select credit", () => {
    const block = QuestionBlockSchema.parse({ id: "q", type: "multi_select", prompt: { default: "Pick" }, choices: [{ id: "a", label: { default: "A" } }, { id: "b", label: { default: "B" } }, { id: "c", label: { default: "C" } }], selection: {}, validation: { correctChoiceIds: ["a", "b"], correctnessMode: "PARTIAL_ALLOWED" }, grading: { correctPoints: 10, incorrectPoints: 0, partialCredit: "PROPORTIONAL" } });
    expect(gradeBlockSubmission(block, { choiceIds: ["a"] })).toMatchObject({ gradable: true, correct: false, fraction: 0.5, earnedPoints: 5 });
  });

  it("grades numeric tolerance, ordering, and matching using reusable primitives", () => {
    const numeric = QuestionBlockSchema.parse({ id: "n", type: "number_input", prompt: { default: "Measure" }, acceptance: { type: "ABS_TOLERANCE", target: 100, tolerance: 2 } });
    expect(gradeBlockSubmission(numeric, { value: 101.5 })).toMatchObject({ gradable: true, correct: true });
    const ordering = QuestionBlockSchema.parse({ id: "o", type: "ordering", prompt: { default: "Order" }, items: [{ id: "1", label: { default: "One" } }, { id: "2", label: { default: "Two" } }], shuffleItems: true, validation: { correctOrderIds: ["2", "1"] } });
    expect(gradeBlockSubmission(ordering, { orderedIds: ["2", "1"] })).toMatchObject({ gradable: true, correct: true });
    const matching = QuestionBlockSchema.parse({ id: "m", type: "matching", prompt: { default: "Match" }, leftItems: [{ id: "l1", label: { default: "L1" } }, { id: "l2", label: { default: "L2" } }], rightItems: [{ id: "r1", label: { default: "R1" } }, { id: "r2", label: { default: "R2" } }], shuffleRight: true, validation: { pairs: [{ leftId: "l1", rightId: "r2" }, { leftId: "l2", rightId: "r1" }] } });
    expect(gradeBlockSubmission(matching, { pairs: [{ leftId: "l1", rightId: "r2" }, { leftId: "l2", rightId: "r1" }] })).toMatchObject({ gradable: true, correct: true });
  });
});
