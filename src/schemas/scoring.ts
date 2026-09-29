import { z } from "zod";
import { ConditionExprSchema } from "./rules";

export type ScoreExpr =
  | { type: "constant"; value: number }
  | { type: "metric"; key: string }
  | { type: "add"; values: ScoreExpr[] }
  | { type: "subtract"; left: ScoreExpr; right: ScoreExpr }
  | { type: "multiply"; values: ScoreExpr[] }
  | { type: "divide"; numerator: ScoreExpr; denominator: ScoreExpr; onZero: number }
  | { type: "min"; values: ScoreExpr[] }
  | { type: "max"; values: ScoreExpr[] }
  | { type: "clamp"; value: ScoreExpr; min?: number; max?: number }
  | { type: "round"; value: ScoreExpr; decimals: number }
  | { type: "if"; condition: z.infer<typeof ConditionExprSchema>; then: ScoreExpr; else: ScoreExpr };

export const ScoreExprSchema: z.ZodType<ScoreExpr> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("constant"), value: z.number().finite() }).strict(),
    z.object({ type: z.literal("metric"), key: z.string().min(1) }).strict(),
    z.object({ type: z.literal("add"), values: z.array(ScoreExprSchema).min(1).max(100) }).strict(),
    z.object({ type: z.literal("subtract"), left: ScoreExprSchema, right: ScoreExprSchema }).strict(),
    z.object({ type: z.literal("multiply"), values: z.array(ScoreExprSchema).min(1).max(100) }).strict(),
    z.object({ type: z.literal("divide"), numerator: ScoreExprSchema, denominator: ScoreExprSchema, onZero: z.number().finite() }).strict(),
    z.object({ type: z.literal("min"), values: z.array(ScoreExprSchema).min(1).max(100) }).strict(),
    z.object({ type: z.literal("max"), values: z.array(ScoreExprSchema).min(1).max(100) }).strict(),
    z.object({ type: z.literal("clamp"), value: ScoreExprSchema, min: z.number().finite().optional(), max: z.number().finite().optional() }).strict(),
    z.object({ type: z.literal("round"), value: ScoreExprSchema, decimals: z.number().int().min(0).max(8) }).strict(),
    z.object({ type: z.literal("if"), condition: ConditionExprSchema, then: ScoreExprSchema, else: ScoreExprSchema }).strict(),
  ])
);

export const ScoringDefinitionSchema = z.object({
  outputKey: z.string().min(1),
  outputLabel: z.string().min(1),
  expression: ScoreExprSchema,
  floor: z.number().finite().optional(),
  cap: z.number().finite().optional(),
  rounding: z.object({ decimals: z.number().int().min(0).max(8) }).strict().optional(),
  countsTowardEvent: z.boolean().default(true),
}).strict();

export type ScoringDefinition = z.infer<typeof ScoringDefinitionSchema>;
