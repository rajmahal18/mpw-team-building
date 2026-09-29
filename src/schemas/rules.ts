import { z } from "zod";
import { CompareOpSchema } from "./shared";

export type ValueExpr =
  | { type: "literal"; value: unknown }
  | { type: "metric"; key: string }
  | { type: "score"; scope: "ACTIVITY" | "EVENT"; key?: string }
  | { type: "run"; field: "attemptNo" | "elapsedMs" | "status" }
  | { type: "event"; field: "state" | "now" }
  | { type: "variable"; scope: string; key: string };

export const ValueExprSchema: z.ZodType<ValueExpr> = z.discriminatedUnion("type", [
  z.object({ type: z.literal("literal"), value: z.unknown() }).strict(),
  z.object({ type: z.literal("metric"), key: z.string().min(1) }).strict(),
  z.object({ type: z.literal("score"), scope: z.enum(["ACTIVITY", "EVENT"]), key: z.string().optional() }).strict(),
  z.object({ type: z.literal("run"), field: z.enum(["attemptNo", "elapsedMs", "status"]) }).strict(),
  z.object({ type: z.literal("event"), field: z.enum(["state", "now"]) }).strict(),
  z.object({ type: z.literal("variable"), scope: z.string().min(1), key: z.string().min(1) }).strict(),
]);

export type ConditionExpr =
  | { type: "compare"; left: ValueExpr; op: z.infer<typeof CompareOpSchema>; right: ValueExpr }
  | { type: "exists"; value: ValueExpr }
  | { type: "all"; conditions: ConditionExpr[] }
  | { type: "any"; conditions: ConditionExpr[] }
  | { type: "not"; condition: ConditionExpr };

export const ConditionExprSchema: z.ZodType<ConditionExpr> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("compare"), left: ValueExprSchema, op: CompareOpSchema, right: ValueExprSchema }).strict(),
    z.object({ type: z.literal("exists"), value: ValueExprSchema }).strict(),
    z.object({ type: z.literal("all"), conditions: z.array(ConditionExprSchema).max(100) }).strict(),
    z.object({ type: z.literal("any"), conditions: z.array(ConditionExprSchema).max(100) }).strict(),
    z.object({ type: z.literal("not"), condition: ConditionExprSchema }).strict(),
  ])
);

export const TriggerDefinitionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ACTIVITY_RUN_COMPLETED") }).strict(),
  z.object({ type: z.literal("SUBMISSION_ACCEPTED") }).strict(),
  z.object({ type: z.literal("TIMER_EXPIRED"), timerKey: z.string().min(1) }).strict(),
  z.object({ type: z.literal("MANUAL"), key: z.string().min(1) }).strict(),
]);

export const RuleActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("ADD_SCORE"),
    amount: ValueExprSchema,
    dimensionKey: z.string().min(1).default("event_points"),
    reason: z.string().min(1),
  }).strict(),
  z.object({ type: z.literal("MARK_RUN_FAILED") }).strict(),
  z.object({ type: z.literal("UNLOCK_ACTIVITY"), activityId: z.string().min(1) }).strict(),
]);

export const RuleDefinitionSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean().default(true),
  name: z.string().optional(),
  trigger: TriggerDefinitionSchema,
  condition: ConditionExprSchema.optional(),
  actions: z.array(RuleActionSchema).min(1).max(50),
  executionPolicy: z.object({
    oncePer: z.enum(["EVENT", "TEAM", "ENTRY", "ACTIVITY_RUN", "TRIGGER_OCCURRENCE"]).optional(),
    maxExecutions: z.number().int().positive().max(1000).optional(),
  }).strict().optional(),
}).strict();

export type RuleDefinition = z.infer<typeof RuleDefinitionSchema>;
