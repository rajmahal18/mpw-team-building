import type { ActivityBlock, ActivityDefinition } from "@/schemas/activity";
import type { ConditionExpr, RuleDefinition, ValueExpr } from "@/schemas/rules";
import type { ScoreExpr, ScoringDefinition } from "@/schemas/scoring";

export const BLOCK_CATALOG: Array<{ type: ActivityBlock["type"]; label: string; group: string; description: string }> = [
  { type: "rich_text", label: "Instructions / text", group: "Content", description: "Organizer-authored mechanics, clues, reminders, or narrative." },
  { type: "media_display", label: "Display media", group: "Content", description: "Show an image, audio, video, or file already stored by the platform." },
  { type: "single_select", label: "Multiple choice", group: "Questions", description: "One answer; any number of choices." },
  { type: "multi_select", label: "Multiple answers", group: "Questions", description: "Select one or more correct choices." },
  { type: "fill_blank", label: "Fill in the blank", group: "Questions", description: "Text answer with exact, contains, fuzzy, or manual checking." },
  { type: "text_input", label: "Short answer", group: "Questions", description: "Short organizer-authored text question." },
  { type: "textarea", label: "Long answer", group: "Questions", description: "Reflection, explanation, or free-form response." },
  { type: "number_input", label: "Numeric answer", group: "Questions", description: "Exact, range, tolerance, or manual numeric validation." },
  { type: "ordering", label: "Ordering", group: "Questions", description: "Arrange arbitrary items into the correct sequence." },
  { type: "matching", label: "Matching", group: "Questions", description: "Match arbitrary left and right items." },
  { type: "question_pool", label: "Question bank / random draw", group: "Questions", description: "Store a bank of organizer-authored questions and draw all or a random subset per run." },
  { type: "media_submission", label: "Photo / video / file proof", group: "Evidence", description: "Require one or more media submissions." },
  { type: "manual_metric", label: "Record a result", group: "Operations", description: "Marshal or organizer records time, count, volume, distance, or another metric." },
  { type: "marshal_decision", label: "Marshal decision", group: "Operations", description: "Configurable pass/fail or any organizer-defined decision options." },
  { type: "judge_rubric", label: "Judge rubric", group: "Operations", description: "Arbitrary criteria, weights, scales, and judge aggregation." },
  { type: "acknowledge", label: "Acknowledge", group: "Operations", description: "Participant confirms that an instruction or safety notice was read." },
];

let counter = 0;
export function builderId(prefix: string) {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}

export function createBlock(type: ActivityBlock["type"]): ActivityBlock {
  const id = builderId(type.replaceAll("_", "-"));
  switch (type) {
    case "rich_text": return { id, type, body: { default: "Enter instructions here." }, required: false };
    case "media_display": return { id, type, mediaAssetId: "asset-id", mediaKind: "IMAGE", caption: { default: "Media caption" }, required: false };
    case "single_select": {
      const a = builderId("choice"); const b = builderId("choice");
      return { id, type, prompt: { default: "Enter your question." }, choices: [{ id: a, label: { default: "Choice 1" } }, { id: b, label: { default: "Choice 2" } }], shuffleChoices: false, validation: { correctChoiceIds: [a] }, scoring: { correct: 1, incorrect: 0 }, required: true };
    }
    case "multi_select": {
      const a = builderId("choice"); const b = builderId("choice"); const c = builderId("choice");
      return { id, type, prompt: { default: "Select all that apply." }, choices: [{ id: a, label: { default: "Choice 1" } }, { id: b, label: { default: "Choice 2" } }, { id: c, label: { default: "Choice 3" } }], shuffleChoices: false, selection: {}, validation: { correctChoiceIds: [a, b], correctnessMode: "EXACT_SET" }, required: true };
    }
    case "fill_blank": return { id, type, prompt: { default: "Complete the statement." }, matcher: { type: "EXACT", accepted: ["Answer"], normalization: defaultNormalization() }, required: true };
    case "text_input": return { id, type, prompt: { default: "Enter a short answer." }, matcher: { type: "MANUAL_REVIEW" }, required: true };
    case "textarea": return { id, type, prompt: { default: "Enter your response." }, matcher: { type: "MANUAL_REVIEW" }, required: true };
    case "number_input": return { id, type, prompt: { default: "Enter the numeric result." }, acceptance: { type: "EXACT", value: 0 }, required: true };
    case "ordering": {
      const a = builderId("item"); const b = builderId("item"); const c = builderId("item");
      return { id, type, prompt: { default: "Arrange these in the correct order." }, items: [{ id: a, label: { default: "Item 1" } }, { id: b, label: { default: "Item 2" } }, { id: c, label: { default: "Item 3" } }], shuffleItems: true, validation: { correctOrderIds: [a, b, c] }, required: true };
    }
    case "matching": {
      const l1 = builderId("left"); const l2 = builderId("left"); const r1 = builderId("right"); const r2 = builderId("right");
      return { id, type, prompt: { default: "Match each item." }, leftItems: [{ id: l1, label: { default: "Left 1" } }, { id: l2, label: { default: "Left 2" } }], rightItems: [{ id: r1, label: { default: "Right 1" } }, { id: r2, label: { default: "Right 2" } }], shuffleRight: true, validation: { pairs: [{ leftId: l1, rightId: r1 }, { leftId: l2, rightId: r2 }] }, required: true };
    }
    case "question_pool": {
      const q1 = createBlock("single_select");
      const q2 = createBlock("fill_blank");
      if (q1.type !== "single_select" || q2.type !== "fill_blank") throw new Error("Question factory invariant");
      return { id, type, intro: { default: "Answer the selected questions." }, mode: "RANDOM_N", drawCount: 1, shuffleSelected: true, questions: [q1, q2], required: true };
    }
    case "media_submission": return { id, type, prompt: { default: "Upload proof of completion." }, acceptedKinds: ["IMAGE"], minItems: 1, maxItems: 1, requireMarshalReview: true, required: true };
    case "manual_metric": return { id, type, prompt: { default: "Record the official result." }, metricKey: "result", required: true };
    case "marshal_decision": return { id, type, prompt: { default: "Did the team complete the task?" }, options: [{ id: "passed", label: { default: "Passed" } }, { id: "failed", label: { default: "Failed" } }], required: true };
    case "judge_rubric": return { id, type, rubricKey: "judging", criteria: [{ id: builderId("criterion"), label: { default: "Criterion" }, weight: 1, scale: { min: 1, max: 10, step: 1 } }], aggregateJudges: "AVERAGE", required: true };
    case "acknowledge": return { id, type, prompt: { default: "I have read and understood the instruction." }, required: true };
  }
}

export function defaultNormalization() {
  return { trim: true, collapseWhitespace: true, caseSensitive: false, ignorePunctuation: true, unicodeNormalization: "NFKC" as const };
}

export function createMetric() {
  return { key: `metric_${Date.now().toString(36)}`, label: { default: "Metric" }, type: "NUMBER" as const, source: "ORGANIZER" as const, direction: "HIGHER_BETTER" as const };
}

export function createScoring(metricKey?: string): ScoringDefinition {
  return { outputKey: "activity_score", outputLabel: "Activity score", expression: metricKey ? { type: "metric", key: metricKey } : { type: "constant", value: 0 }, countsTowardEvent: true };
}

export function createScoreExpr(type: ScoreExpr["type"], metricKey?: string): ScoreExpr {
  switch (type) {
    case "constant": return { type, value: 0 };
    case "metric": return { type, key: metricKey || "metric" };
    case "add": return { type, values: [{ type: "constant", value: 0 }, { type: "constant", value: 0 }] };
    case "subtract": return { type, left: { type: "constant", value: 0 }, right: { type: "constant", value: 0 } };
    case "multiply": return { type, values: [{ type: "constant", value: 1 }, { type: "constant", value: 1 }] };
    case "divide": return { type, numerator: { type: "constant", value: 0 }, denominator: { type: "constant", value: 1 }, onZero: 0 };
    case "min": return { type, values: [{ type: "constant", value: 0 }, { type: "constant", value: 0 }] };
    case "max": return { type, values: [{ type: "constant", value: 0 }, { type: "constant", value: 0 }] };
    case "clamp": return { type, value: { type: "constant", value: 0 } };
    case "round": return { type, value: { type: "constant", value: 0 }, decimals: 0 };
    case "if": return { type, condition: createCondition(), then: { type: "constant", value: 1 }, else: { type: "constant", value: 0 } };
  }
}

export function createValueExpr(type: ValueExpr["type"] = "literal", metricKey?: string): ValueExpr {
  switch (type) {
    case "literal": return { type, value: 0 };
    case "metric": return { type, key: metricKey || "metric" };
    case "score": return { type, scope: "ACTIVITY" };
    case "run": return { type, field: "attemptNo" };
    case "event": return { type, field: "state" };
    case "variable": return { type, scope: "event", key: "variable" };
  }
}

export function createCondition(type: ConditionExpr["type"] = "compare"): ConditionExpr {
  switch (type) {
    case "compare": return { type, left: { type: "metric", key: "metric" }, op: "GTE", right: { type: "literal", value: 0 } };
    case "exists": return { type, value: { type: "metric", key: "metric" } };
    case "all": return { type, conditions: [createCondition("compare")] };
    case "any": return { type, conditions: [createCondition("compare")] };
    case "not": return { type, condition: createCondition("compare") };
  }
}

export function createRule(): RuleDefinition {
  return {
    id: builderId("rule"),
    enabled: true,
    name: "New rule",
    trigger: { type: "ACTIVITY_RUN_COMPLETED" },
    actions: [{ type: "ADD_SCORE", amount: { type: "literal", value: 0 }, dimensionKey: "event_points", reason: "Configured rule" }],
    executionPolicy: { oncePer: "ACTIVITY_RUN" },
  };
}

export function cloneDefinition(definition: ActivityDefinition): ActivityDefinition {
  return JSON.parse(JSON.stringify(definition)) as ActivityDefinition;
}
