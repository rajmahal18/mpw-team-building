import { z } from "zod";
import { MachineKeySchema } from "./shared";

export const AttemptAggregateModeSchema = z.enum(["SUM", "BEST", "LATEST", "AVERAGE"]);
export type AttemptAggregateMode = z.infer<typeof AttemptAggregateModeSchema>;

export const PlacementPointRuleSchema = z.object({
  rankFrom: z.number().int().positive(),
  rankTo: z.number().int().positive(),
  points: z.number().finite(),
}).strict().refine((rule) => rule.rankTo >= rule.rankFrom, { message: "rankTo must be >= rankFrom" });

export type PlacementPointRule = z.infer<typeof PlacementPointRuleSchema>;

export const PlacementDefinitionSchema = z.object({
  sourceType: z.enum(["SCORE", "METRIC"]),
  sourceKey: z.string().min(1),
  direction: z.enum(["ASC", "DESC"]),
  attemptMode: AttemptAggregateModeSchema.default("BEST"),
  tieTolerance: z.number().nonnegative().default(0),
  outputDimensionKey: MachineKeySchema,
  rules: z.array(PlacementPointRuleSchema).min(1).max(100),
}).strict();
export type PlacementDefinition = z.infer<typeof PlacementDefinitionSchema>;

export const LeaderboardSourceSchema = z.object({
  id: MachineKeySchema,
  label: z.string().min(1).max(200),
  dimensionKey: z.string().min(1),
  scope: z.enum(["ACTIVITY", "EVENT"]).default("ACTIVITY"),
  activityInstanceIds: z.array(z.string().min(1)).optional(),
  weight: z.number().finite().default(1),
  valueDirection: z.enum(["ASC", "DESC"]).default("DESC"),
  attemptMode: AttemptAggregateModeSchema.default("BEST"),
  selection: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("ALL") }).strict(),
    z.object({ mode: z.literal("BEST_N"), count: z.number().int().positive() }).strict(),
    z.object({ mode: z.literal("DROP_LOWEST_N"), count: z.number().int().nonnegative() }).strict(),
  ]).default({ mode: "ALL" }),
}).strict();
export type LeaderboardSource = z.infer<typeof LeaderboardSourceSchema>;

export const LeaderboardTieBreakerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("SOURCE_TOTAL"), sourceId: MachineKeySchema, direction: z.enum(["ASC", "DESC"]) }).strict(),
  z.object({ type: z.literal("SCORE_DIMENSION"), dimensionKey: z.string().min(1), direction: z.enum(["ASC", "DESC"]) }).strict(),
  z.object({ type: z.literal("FEWER_PENALTIES") }).strict(),
  z.object({ type: z.literal("EARLIER_COMPLETION") }).strict(),
  z.object({ type: z.literal("DECLARE_TIE") }).strict(),
]);
export type LeaderboardTieBreaker = z.infer<typeof LeaderboardTieBreakerSchema>;

export const LeaderboardDefinitionSchema = z.object({
  schemaVersion: z.literal(1),
  eligibleKinds: z.array(z.enum(["TEAM", "INDIVIDUAL", "PAIR", "SUBGROUP", "AD_HOC"])).min(1).default(["TEAM"]),
  sources: z.array(LeaderboardSourceSchema).min(1).max(100),
  primaryDirection: z.enum(["ASC", "DESC"]).default("DESC"),
  tieBreakers: z.array(LeaderboardTieBreakerSchema).max(20).default([]),
  rankStyle: z.enum(["COMPETITION", "DENSE"]).default("COMPETITION"),
  visibility: z.enum(["LIVE", "FINAL_ONLY", "HIDDEN"]).default("LIVE"),
}).strict().superRefine((definition, ctx) => {
  const ids = definition.sources.map((source) => source.id);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", message: "Leaderboard source IDs must be unique", path: ["sources"] });
  for (const tie of definition.tieBreakers) {
    if (tie.type === "SOURCE_TOTAL" && !ids.includes(tie.sourceId)) ctx.addIssue({ code: "custom", message: `Unknown leaderboard source: ${tie.sourceId}`, path: ["tieBreakers"] });
  }
});
export type LeaderboardDefinition = z.infer<typeof LeaderboardDefinitionSchema>;

export const MatchResultSchema = z.object({
  winnerEntryId: z.string().min(1).nullable().optional(),
  sideScores: z.array(z.object({ entryId: z.string().min(1), score: z.number().finite().optional(), result: z.string().max(100).optional() }).strict()).default([]),
  note: z.string().max(2000).optional(),
}).strict();
export type MatchResult = z.infer<typeof MatchResultSchema>;

export const RoundRobinConfigSchema = z.object({
  winPoints: z.number().finite().default(3),
  drawPoints: z.number().finite().default(1),
  lossPoints: z.number().finite().default(0),
  allowDraws: z.boolean().default(true),
}).strict();
export type RoundRobinConfig = z.infer<typeof RoundRobinConfigSchema>;

export const SingleEliminationConfigSchema = z.object({}).strict();
export type SingleEliminationConfig = z.infer<typeof SingleEliminationConfigSchema>;
