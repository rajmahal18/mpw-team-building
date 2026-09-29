import type { ConditionExpr, ValueExpr } from "@/schemas/rules";

export type RuleEvaluationContext = {
  metrics?: Record<string, unknown>;
  scores?: Record<string, unknown>;
  run?: { attemptNo?: number; elapsedMs?: number; status?: string };
  event?: { state?: string; now?: string };
  variables?: Record<string, Record<string, unknown>>;
};

export function resolveValue(expr: ValueExpr, ctx: RuleEvaluationContext): unknown {
  switch (expr.type) {
    case "literal": return expr.value;
    case "metric": return ctx.metrics?.[expr.key];
    case "score": return ctx.scores?.[expr.key ?? expr.scope];
    case "run": return ctx.run?.[expr.field];
    case "event": return ctx.event?.[expr.field];
    case "variable": return ctx.variables?.[expr.scope]?.[expr.key];
  }
}

function compare(left: unknown, op: string, right: unknown): boolean {
  switch (op) {
    case "EQ": return Object.is(left, right);
    case "NE": return !Object.is(left, right);
    case "GT": return typeof left === "number" && typeof right === "number" && left > right;
    case "GTE": return typeof left === "number" && typeof right === "number" && left >= right;
    case "LT": return typeof left === "number" && typeof right === "number" && left < right;
    case "LTE": return typeof left === "number" && typeof right === "number" && left <= right;
    case "IN": return Array.isArray(right) && right.some((item) => Object.is(item, left));
    case "NOT_IN": return Array.isArray(right) && !right.some((item) => Object.is(item, left));
    default: return false;
  }
}

export function evaluateCondition(expr: ConditionExpr, ctx: RuleEvaluationContext): boolean {
  switch (expr.type) {
    case "compare": return compare(resolveValue(expr.left, ctx), expr.op, resolveValue(expr.right, ctx));
    case "exists": return resolveValue(expr.value, ctx) !== undefined && resolveValue(expr.value, ctx) !== null;
    case "all": return expr.conditions.every((condition) => evaluateCondition(condition, ctx));
    case "any": return expr.conditions.some((condition) => evaluateCondition(condition, ctx));
    case "not": return !evaluateCondition(expr.condition, ctx);
  }
}
