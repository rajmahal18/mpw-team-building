import type { ScoreExpr, ScoringDefinition } from "@/schemas/scoring";
import { evaluateCondition, type RuleEvaluationContext } from "@/engine/rules/evaluate-condition";

export type ScoreContext = RuleEvaluationContext & { metrics: Record<string, unknown> };

function finite(value: number): number {
  if (!Number.isFinite(value)) throw new Error("Scoring expression produced a non-finite number");
  return value;
}

export function evaluateScoreExpr(expr: ScoreExpr, ctx: ScoreContext): number {
  switch (expr.type) {
    case "constant": return expr.value;
    case "metric": {
      const value = ctx.metrics[expr.key];
      if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Metric ${expr.key} is not numeric`);
      return value;
    }
    case "add": return finite(expr.values.reduce((sum, item) => sum + evaluateScoreExpr(item, ctx), 0));
    case "subtract": return finite(evaluateScoreExpr(expr.left, ctx) - evaluateScoreExpr(expr.right, ctx));
    case "multiply": return finite(expr.values.reduce((product, item) => product * evaluateScoreExpr(item, ctx), 1));
    case "divide": {
      const denominator = evaluateScoreExpr(expr.denominator, ctx);
      return denominator === 0 ? expr.onZero : finite(evaluateScoreExpr(expr.numerator, ctx) / denominator);
    }
    case "min": return Math.min(...expr.values.map((item) => evaluateScoreExpr(item, ctx)));
    case "max": return Math.max(...expr.values.map((item) => evaluateScoreExpr(item, ctx)));
    case "clamp": {
      let value = evaluateScoreExpr(expr.value, ctx);
      if (expr.min !== undefined) value = Math.max(expr.min, value);
      if (expr.max !== undefined) value = Math.min(expr.max, value);
      return value;
    }
    case "round": {
      const factor = 10 ** expr.decimals;
      return Math.round(evaluateScoreExpr(expr.value, ctx) * factor) / factor;
    }
    case "if": return evaluateCondition(expr.condition, ctx) ? evaluateScoreExpr(expr.then, ctx) : evaluateScoreExpr(expr.else, ctx);
  }
}

export function evaluateScoringDefinition(definition: ScoringDefinition, ctx: ScoreContext): number {
  let value = evaluateScoreExpr(definition.expression, ctx);
  if (definition.floor !== undefined) value = Math.max(definition.floor, value);
  if (definition.cap !== undefined) value = Math.min(definition.cap, value);
  if (definition.rounding) {
    const factor = 10 ** definition.rounding.decimals;
    value = Math.round(value * factor) / factor;
  }
  return finite(value);
}
