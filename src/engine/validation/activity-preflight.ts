import { ActivityDefinitionSchema, type ActivityDefinition } from "@/schemas/activity";
import type { ConditionExpr, ValueExpr } from "@/schemas/rules";
import type { ScoreExpr } from "@/schemas/scoring";

export type PreflightIssue = {
  level: "ERROR" | "WARNING";
  code: string;
  message: string;
  path?: string;
};

function collectValueMetricRefs(value: ValueExpr, refs: Set<string>) {
  if (value.type === "metric") refs.add(value.key);
}

function collectConditionMetricRefs(condition: ConditionExpr, refs: Set<string>) {
  if (condition.type === "compare") { collectValueMetricRefs(condition.left, refs); collectValueMetricRefs(condition.right, refs); }
  if (condition.type === "exists") collectValueMetricRefs(condition.value, refs);
  if (condition.type === "all" || condition.type === "any") condition.conditions.forEach((child) => collectConditionMetricRefs(child, refs));
  if (condition.type === "not") collectConditionMetricRefs(condition.condition, refs);
}

function collectScoreMetricRefs(expression: ScoreExpr, refs: Set<string>) {
  if (expression.type === "metric") refs.add(expression.key);
  if (expression.type === "add" || expression.type === "multiply" || expression.type === "min" || expression.type === "max") expression.values.forEach((child) => collectScoreMetricRefs(child, refs));
  if (expression.type === "subtract") { collectScoreMetricRefs(expression.left, refs); collectScoreMetricRefs(expression.right, refs); }
  if (expression.type === "divide") { collectScoreMetricRefs(expression.numerator, refs); collectScoreMetricRefs(expression.denominator, refs); }
  if (expression.type === "clamp" || expression.type === "round") collectScoreMetricRefs(expression.value, refs);
  if (expression.type === "if") { collectConditionMetricRefs(expression.condition, refs); collectScoreMetricRefs(expression.then, refs); collectScoreMetricRefs(expression.else, refs); }
}

export function preflightActivity(input: unknown): { definition?: ActivityDefinition; issues: PreflightIssue[] } {
  const parsed = ActivityDefinitionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      issues: parsed.error.issues.map((issue) => ({
        level: "ERROR",
        code: "SCHEMA_INVALID",
        message: issue.message,
        path: issue.path.join("."),
      })),
    };
  }

  const definition = parsed.data;
  const issues: PreflightIssue[] = [];
  const metricKeys = new Set(definition.metrics.map((metric) => metric.key));
  const referencedMetrics = new Set<string>();

  if (definition.scoring) collectScoreMetricRefs(definition.scoring.expression, referencedMetrics);
  for (const rule of definition.rules) {
    if (rule.condition) collectConditionMetricRefs(rule.condition, referencedMetrics);
    for (const action of rule.actions) if (action.type === "ADD_SCORE") collectValueMetricRefs(action.amount, referencedMetrics);
  }

  const inspectQuestion = (block: ActivityDefinition["content"][number] | Extract<ActivityDefinition["content"][number], { type: "question_pool" }>["questions"][number], path: string) => {
    if (block.type === "number_input" && block.metricKey) referencedMetrics.add(block.metricKey);
    if (block.type === "number_input" && block.acceptance?.type === "RANGE" && block.acceptance.min !== undefined && block.acceptance.max !== undefined && block.acceptance.min > block.acceptance.max) {
      issues.push({ level: "ERROR", code: "INVALID_NUMERIC_RANGE", message: "Numeric answer minimum cannot exceed maximum.", path: `${path}.acceptance` });
    }
    if ((block.type === "single_select" || block.type === "multi_select") && (block.validation.correctChoiceIds?.length ?? 0) === 0) issues.push({ level: "WARNING", code: "QUESTION_HAS_NO_ANSWER_KEY", message: "Question has no configured correct answer; it cannot be automatically graded.", path: `${path}.validation` });
    if ((block.type === "fill_blank" || block.type === "text_input" || block.type === "textarea") && !block.matcher) issues.push({ level: "WARNING", code: "TEXT_QUESTION_HAS_NO_MATCHER", message: "Text response has no answer matcher and will require downstream/manual handling.", path: `${path}.matcher` });
  };

  definition.content.forEach((block, index) => {
    if (block.type === "manual_metric") referencedMetrics.add(block.metricKey);
    if (block.type === "question_pool") block.questions.forEach((question, questionIndex) => inspectQuestion(question, `content.${index}.questions.${questionIndex}`));
    else inspectQuestion(block, `content.${index}`);
  });

  for (const key of referencedMetrics) {
    if (!metricKeys.has(key)) issues.push({ level: "ERROR", code: "UNKNOWN_METRIC", message: `Configuration references unknown metric: ${key}` });
  }

  if (definition.completion.type === "ANY_N_BLOCKS" && definition.completion.count > definition.content.length) {
    issues.push({ level: "ERROR", code: "IMPOSSIBLE_COMPLETION_COUNT", message: "Completion requires more blocks than the activity contains.", path: "completion.count" });
  }

  if (definition.safety?.intensity === "HIGH" && (!definition.safety.notes || definition.safety.notes.length === 0)) {
    issues.push({ level: "WARNING", code: "HIGH_INTENSITY_NO_SAFETY_NOTES", message: "High-intensity activity has no safety notes." });
  }

  return { definition, issues };
}
