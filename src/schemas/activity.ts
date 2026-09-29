import { z } from "zod";
import { ConditionExprSchema, RuleDefinitionSchema } from "./rules";
import { LocalizedTextSchema, MachineKeySchema, TechnicalLimits, VisibilitySchema } from "./shared";
import { ScoringDefinitionSchema } from "./scoring";

const BlockBaseShape = {
  id: z.string().min(1).max(100),
  visibleTo: VisibilitySchema.optional(),
  title: LocalizedTextSchema.optional(),
  required: z.boolean().optional(),
  when: ConditionExprSchema.optional(),
};

const PromptMediaShape = {
  promptMediaAssetId: z.string().min(1).optional(),
};

const QuestionBaseShape = {
  ...PromptMediaShape,
  hint: LocalizedTextSchema.optional(),
  timeLimitMs: z.number().int().positive().optional(),
  maxAttempts: z.number().int().positive().optional(),
  grading: z.object({
    correctPoints: z.number().finite().default(1),
    incorrectPoints: z.number().finite().default(0),
    partialCredit: z.enum(["NONE", "PROPORTIONAL"]).default("PROPORTIONAL"),
  }).strict().optional(),
};

export const RichTextBlockSchema = z.object({
  ...BlockBaseShape,
  type: z.literal("rich_text"),
  body: LocalizedTextSchema,
}).strict();

export const MediaDisplayBlockSchema = z.object({
  ...BlockBaseShape,
  type: z.literal("media_display"),
  mediaAssetId: z.string().min(1),
  mediaKind: z.enum(["IMAGE", "AUDIO", "VIDEO", "FILE"]),
  caption: LocalizedTextSchema.optional(),
}).strict();

const ChoiceSchema = z.object({
  id: z.string().min(1).max(100),
  label: LocalizedTextSchema.optional(),
  mediaAssetId: z.string().optional(),
  organizerNote: z.string().max(2000).optional(),
}).strict().refine((value) => Boolean(value.label || value.mediaAssetId), {
  message: "Each choice needs text or media",
});

export const SingleSelectBlockSchema = z.object({
  ...BlockBaseShape,
  ...QuestionBaseShape,
  type: z.literal("single_select"),
  prompt: LocalizedTextSchema,
  choices: z.array(ChoiceSchema).min(2).max(TechnicalLimits.maxChoicesPerQuestion),
  shuffleChoices: z.boolean().optional(),
  validation: z.object({
    correctChoiceIds: z.array(z.string()).max(TechnicalLimits.maxChoicesPerQuestion).optional(),
  }).strict(),
  scoring: z.object({
    correct: z.number().finite().default(1),
    incorrect: z.number().finite().default(0),
  }).strict().optional(),
}).strict();

export const MultiSelectBlockSchema = z.object({
  ...BlockBaseShape,
  ...QuestionBaseShape,
  type: z.literal("multi_select"),
  prompt: LocalizedTextSchema,
  choices: z.array(ChoiceSchema).min(2).max(TechnicalLimits.maxChoicesPerQuestion),
  shuffleChoices: z.boolean().optional(),
  selection: z.object({ min: z.number().int().nonnegative().optional(), max: z.number().int().positive().optional() }).strict(),
  validation: z.object({
    correctChoiceIds: z.array(z.string()).max(TechnicalLimits.maxChoicesPerQuestion).optional(),
    correctnessMode: z.enum(["EXACT_SET", "PARTIAL_ALLOWED"]),
  }).strict(),
}).strict();

const TextNormalizationSchema = z.object({
  trim: z.boolean().default(true),
  collapseWhitespace: z.boolean().default(true),
  caseSensitive: z.boolean().default(false),
  ignorePunctuation: z.boolean().optional(),
  unicodeNormalization: z.enum(["NFC", "NFKC", "NONE"]).optional(),
}).strict();

const TextMatcherSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("EXACT"), accepted: z.array(z.string()).min(1), normalization: TextNormalizationSchema }).strict(),
  z.object({ type: z.literal("CONTAINS"), accepted: z.array(z.string()).min(1), normalization: TextNormalizationSchema }).strict(),
  z.object({ type: z.literal("FUZZY"), accepted: z.array(z.string()).min(1), threshold: z.number().min(0).max(1), normalization: TextNormalizationSchema }).strict(),
  z.object({ type: z.literal("MANUAL_REVIEW") }).strict(),
]);

function textInputShape(type: "text_input" | "textarea" | "fill_blank") {
  return z.object({
    ...BlockBaseShape,
    ...QuestionBaseShape,
    type: z.literal(type),
    prompt: LocalizedTextSchema,
    matcher: TextMatcherSchema.optional(),
    maxLength: z.number().int().positive().max(TechnicalLimits.maxTextLength).optional(),
  }).strict();
}

export const TextInputBlockSchema = textInputShape("text_input");
export const TextareaBlockSchema = textInputShape("textarea");
export const FillBlankBlockSchema = textInputShape("fill_blank");

const NumericAcceptanceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("EXACT"), value: z.number().finite() }).strict(),
  z.object({ type: z.literal("RANGE"), min: z.number().finite().optional(), max: z.number().finite().optional() }).strict(),
  z.object({ type: z.literal("ABS_TOLERANCE"), target: z.number().finite(), tolerance: z.number().nonnegative() }).strict(),
  z.object({ type: z.literal("PERCENT_TOLERANCE"), target: z.number().finite(), percent: z.number().nonnegative() }).strict(),
  z.object({ type: z.literal("MANUAL") }).strict(),
]);

export const NumberInputBlockSchema = z.object({
  ...BlockBaseShape,
  ...QuestionBaseShape,
  type: z.literal("number_input"),
  prompt: LocalizedTextSchema,
  unit: z.string().max(50).optional(),
  acceptance: NumericAcceptanceSchema.optional(),
  metricKey: z.string().min(1).optional(),
}).strict();

const OrderItemSchema = z.object({
  id: z.string().min(1).max(100),
  label: LocalizedTextSchema.optional(),
  mediaAssetId: z.string().min(1).optional(),
}).strict().refine((value) => Boolean(value.label || value.mediaAssetId), { message: "Each ordering item needs text or media" });

export const OrderingBlockSchema = z.object({
  ...BlockBaseShape,
  ...QuestionBaseShape,
  type: z.literal("ordering"),
  prompt: LocalizedTextSchema,
  items: z.array(OrderItemSchema).min(2).max(TechnicalLimits.maxChoicesPerQuestion),
  shuffleItems: z.boolean().default(true),
  validation: z.object({ correctOrderIds: z.array(z.string()).min(2).max(TechnicalLimits.maxChoicesPerQuestion) }).strict(),
}).strict();

const MatchingItemSchema = z.object({ id: z.string().min(1).max(100), label: LocalizedTextSchema }).strict();
export const MatchingBlockSchema = z.object({
  ...BlockBaseShape,
  ...QuestionBaseShape,
  type: z.literal("matching"),
  prompt: LocalizedTextSchema,
  leftItems: z.array(MatchingItemSchema).min(1).max(TechnicalLimits.maxChoicesPerQuestion),
  rightItems: z.array(MatchingItemSchema).min(1).max(TechnicalLimits.maxChoicesPerQuestion),
  shuffleRight: z.boolean().default(true),
  validation: z.object({ pairs: z.array(z.object({ leftId: z.string().min(1), rightId: z.string().min(1) }).strict()).min(1) }).strict(),
}).strict();

export const QuestionBlockSchema = z.discriminatedUnion("type", [
  SingleSelectBlockSchema,
  MultiSelectBlockSchema,
  TextInputBlockSchema,
  TextareaBlockSchema,
  FillBlankBlockSchema,
  NumberInputBlockSchema,
  OrderingBlockSchema,
  MatchingBlockSchema,
]).superRefine((block, ctx) => {
  if (block.type === "single_select" || block.type === "multi_select") {
    const ids = block.choices.map((choice) => choice.id);
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", message: "Choice IDs must be unique", path: ["choices"] });
    const correct = block.validation.correctChoiceIds ?? [];
    for (const id of correct) if (!ids.includes(id)) ctx.addIssue({ code: "custom", message: `Unknown correct choice: ${id}`, path: ["validation", "correctChoiceIds"] });
    if (block.type === "single_select" && correct.length > 1) ctx.addIssue({ code: "custom", message: "Single-select can have at most one correct choice", path: ["validation", "correctChoiceIds"] });
    if (block.type === "multi_select") {
      if (block.selection.max !== undefined && block.selection.max > ids.length) ctx.addIssue({ code: "custom", message: "Selection max cannot exceed choices", path: ["selection", "max"] });
      if (block.selection.min !== undefined && block.selection.max !== undefined && block.selection.min > block.selection.max) ctx.addIssue({ code: "custom", message: "Selection min cannot exceed max", path: ["selection"] });
    }
  }
  if (block.type === "ordering") {
    const ids = block.items.map((item) => item.id);
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", message: "Ordering item IDs must be unique", path: ["items"] });
    if (block.validation.correctOrderIds.length !== ids.length || new Set(block.validation.correctOrderIds).size !== ids.length || block.validation.correctOrderIds.some((id) => !ids.includes(id))) ctx.addIssue({ code: "custom", message: "Correct order must contain every item exactly once", path: ["validation", "correctOrderIds"] });
  }
  if (block.type === "matching") {
    const leftIds = block.leftItems.map((item) => item.id);
    const rightIds = block.rightItems.map((item) => item.id);
    if (new Set(leftIds).size !== leftIds.length) ctx.addIssue({ code: "custom", message: "Left matching IDs must be unique", path: ["leftItems"] });
    if (new Set(rightIds).size !== rightIds.length) ctx.addIssue({ code: "custom", message: "Right matching IDs must be unique", path: ["rightItems"] });
    const seenLeft = new Set<string>();
    for (const pair of block.validation.pairs) {
      if (!leftIds.includes(pair.leftId) || !rightIds.includes(pair.rightId)) ctx.addIssue({ code: "custom", message: "Matching pair references an unknown item", path: ["validation", "pairs"] });
      if (seenLeft.has(pair.leftId)) ctx.addIssue({ code: "custom", message: "Each left matching item can appear only once", path: ["validation", "pairs"] });
      seenLeft.add(pair.leftId);
    }
  }
});

const QuestionPoolBlockObjectSchema = z.object({
  ...BlockBaseShape,
  type: z.literal("question_pool"),
  intro: LocalizedTextSchema.optional(),
  mode: z.enum(["ALL", "RANDOM_N"]).default("RANDOM_N"),
  drawCount: z.number().int().positive().optional(),
  shuffleSelected: z.boolean().default(true),
  questions: z.array(QuestionBlockSchema).min(1).max(TechnicalLimits.maxBlocksPerActivity),
}).strict();

export const QuestionPoolBlockSchema = QuestionPoolBlockObjectSchema.superRefine((pool, ctx) => {
  const ids = pool.questions.map((question) => question.id);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", message: "Question IDs in a pool must be unique", path: ["questions"] });
  if (pool.mode === "RANDOM_N" && !pool.drawCount) ctx.addIssue({ code: "custom", message: "Random question pool requires drawCount", path: ["drawCount"] });
  if (pool.drawCount && pool.drawCount > pool.questions.length) ctx.addIssue({ code: "custom", message: "drawCount cannot exceed the number of questions", path: ["drawCount"] });
});

const MediaSubmissionBlockObjectSchema = z.object({
  ...BlockBaseShape,
  type: z.literal("media_submission"),
  prompt: LocalizedTextSchema,
  acceptedKinds: z.array(z.enum(["IMAGE", "VIDEO", "AUDIO", "FILE"])).min(1),
  minItems: z.number().int().nonnegative().default(1),
  maxItems: z.number().int().positive().default(1),
  requireMarshalReview: z.boolean().default(false),
}).strict();
export const MediaSubmissionBlockSchema = MediaSubmissionBlockObjectSchema.refine((block) => block.maxItems >= block.minItems, { message: "maxItems must be >= minItems" });

export const ManualMetricBlockSchema = z.object({
  ...BlockBaseShape,
  type: z.literal("manual_metric"),
  prompt: LocalizedTextSchema,
  metricKey: z.string().min(1),
  unit: z.string().max(50).optional(),
}).strict();

export const MarshalDecisionBlockSchema = z.object({
  ...BlockBaseShape,
  type: z.literal("marshal_decision"),
  prompt: LocalizedTextSchema,
  options: z.array(z.object({ id: z.string().min(1), label: LocalizedTextSchema }).strict()).min(2).max(20),
}).strict();

export const AcknowledgeBlockSchema = z.object({
  ...BlockBaseShape,
  type: z.literal("acknowledge"),
  prompt: LocalizedTextSchema,
}).strict();

export const JudgeRubricBlockSchema = z.object({
  ...BlockBaseShape,
  type: z.literal("judge_rubric"),
  rubricKey: z.string().min(1),
  criteria: z.array(z.object({
    id: z.string().min(1),
    label: LocalizedTextSchema,
    weight: z.number().positive(),
    scale: z.object({
      min: z.number().finite(),
      max: z.number().finite(),
      step: z.number().positive().optional(),
    }).strict().refine((scale) => scale.max > scale.min, { message: "Scale max must exceed min" }),
  }).strict()).min(1).max(50),
  aggregateJudges: z.enum(["AVERAGE", "MEDIAN", "SUM", "DROP_HIGH_LOW_AVERAGE"]).default("AVERAGE"),
}).strict();

export const ActivityBlockSchema = z.discriminatedUnion("type", [
  RichTextBlockSchema,
  MediaDisplayBlockSchema,
  SingleSelectBlockSchema,
  MultiSelectBlockSchema,
  TextInputBlockSchema,
  TextareaBlockSchema,
  FillBlankBlockSchema,
  NumberInputBlockSchema,
  OrderingBlockSchema,
  MatchingBlockSchema,
  QuestionPoolBlockObjectSchema,
  MediaSubmissionBlockObjectSchema,
  ManualMetricBlockSchema,
  MarshalDecisionBlockSchema,
  AcknowledgeBlockSchema,
  JudgeRubricBlockSchema,
]).superRefine((block, ctx) => {
  if (block.type === "single_select" || block.type === "multi_select") {
    const ids = block.choices.map((choice) => choice.id);
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", message: "Choice IDs must be unique", path: ["choices"] });
    const correct = block.validation.correctChoiceIds ?? [];
    for (const id of correct) if (!ids.includes(id)) ctx.addIssue({ code: "custom", message: `Unknown correct choice: ${id}`, path: ["validation", "correctChoiceIds"] });
    if (block.type === "single_select" && correct.length > 1) ctx.addIssue({ code: "custom", message: "Single-select can have at most one correct choice", path: ["validation", "correctChoiceIds"] });
    if (block.type === "multi_select") {
      if (block.selection.max !== undefined && block.selection.max > ids.length) ctx.addIssue({ code: "custom", message: "Selection max cannot exceed choices", path: ["selection", "max"] });
      if (block.selection.min !== undefined && block.selection.max !== undefined && block.selection.min > block.selection.max) ctx.addIssue({ code: "custom", message: "Selection min cannot exceed max", path: ["selection"] });
    }
  }
  if (block.type === "ordering") {
    const ids = block.items.map((item) => item.id);
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", message: "Ordering item IDs must be unique", path: ["items"] });
    if (block.validation.correctOrderIds.length !== ids.length || new Set(block.validation.correctOrderIds).size !== ids.length || block.validation.correctOrderIds.some((id) => !ids.includes(id))) {
      ctx.addIssue({ code: "custom", message: "Correct order must contain every item exactly once", path: ["validation", "correctOrderIds"] });
    }
  }
  if (block.type === "matching") {
    const leftIds = block.leftItems.map((item) => item.id);
    const rightIds = block.rightItems.map((item) => item.id);
    if (new Set(leftIds).size !== leftIds.length) ctx.addIssue({ code: "custom", message: "Left matching IDs must be unique", path: ["leftItems"] });
    if (new Set(rightIds).size !== rightIds.length) ctx.addIssue({ code: "custom", message: "Right matching IDs must be unique", path: ["rightItems"] });
    const seenLeft = new Set<string>();
    for (const pair of block.validation.pairs) {
      if (!leftIds.includes(pair.leftId) || !rightIds.includes(pair.rightId)) ctx.addIssue({ code: "custom", message: "Matching pair references an unknown item", path: ["validation", "pairs"] });
      if (seenLeft.has(pair.leftId)) ctx.addIssue({ code: "custom", message: "Each left matching item can appear only once", path: ["validation", "pairs"] });
      seenLeft.add(pair.leftId);
    }
  }
  if (block.type === "question_pool") {
    const ids = block.questions.map((question) => question.id);
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", message: "Question IDs in a pool must be unique", path: ["questions"] });
    if (block.mode === "RANDOM_N" && !block.drawCount) ctx.addIssue({ code: "custom", message: "Random question pool requires drawCount", path: ["drawCount"] });
    if (block.drawCount && block.drawCount > block.questions.length) ctx.addIssue({ code: "custom", message: "drawCount cannot exceed the number of questions", path: ["drawCount"] });
  }
  if (block.type === "media_submission" && block.maxItems < block.minItems) ctx.addIssue({ code: "custom", message: "maxItems must be >= minItems", path: ["maxItems"] });
});

export const ParticipationPolicySchema = z.object({
  mode: z.enum(["INDIVIDUAL", "WHOLE_TEAM", "PAIR", "SUBGROUP", "TEAM_VS_TEAM", "MULTI_TEAM_HEAT", "SELECTED_REPRESENTATIVES"]),
  minActive: z.number().int().positive().optional(),
  maxActive: z.number().int().positive().optional(),
  selection: z.discriminatedUnion("type", [
    z.object({ type: z.literal("ALL") }).strict(),
    z.object({ type: z.literal("CAPTAIN") }).strict(),
    z.object({ type: z.literal("ORGANIZER_ASSIGNED") }).strict(),
    z.object({ type: z.literal("TEAM_CHOOSES"), count: z.number().int().positive().optional() }).strict(),
    z.object({ type: z.literal("RANDOM"), count: z.number().int().positive(), scope: z.enum(["TEAM", "EVENT"]) }).strict(),
  ]).optional(),
  substitutions: z.object({ allowed: z.boolean(), untilState: z.enum(["NOT_STARTED", "LIVE"]).optional() }).strict().optional(),
}).strict().refine((p) => p.maxActive === undefined || p.minActive === undefined || p.maxActive >= p.minActive, { message: "maxActive must be >= minActive" });

export const MetricDefinitionSchema = z.object({
  key: MachineKeySchema,
  label: LocalizedTextSchema,
  type: z.enum(["NUMBER", "DURATION_MS", "COUNT", "DISTANCE", "VOLUME", "WEIGHT", "PERCENT", "BOOLEAN", "TEXT", "RUBRIC", "PLACEMENT"]),
  unit: z.string().max(50).optional(),
  direction: z.enum(["HIGHER_BETTER", "LOWER_BETTER", "TARGET_BEST", "NEUTRAL"]).optional(),
  target: z.number().finite().optional(),
  source: z.enum(["SYSTEM", "SUBMISSION", "MARSHAL", "JUDGE", "ORGANIZER", "COMPETITION"]),
}).strict();

export const TimingPolicySchema = z.object({
  mode: z.enum(["NONE", "COUNTDOWN", "STOPWATCH", "WINDOW"]),
  durationMs: z.number().int().positive().optional(),
  startTrigger: z.enum(["MANUAL", "FIRST_OPEN", "FIRST_INPUT", "MARSHAL", "RULE"]).optional(),
  expiryAction: z.enum(["NONE", "AUTO_SUBMIT", "FAIL", "REQUIRE_REVIEW"]).optional(),
  pause: z.object({ allowed: z.boolean(), allowedCapabilities: z.array(z.string()).optional() }).strict().optional(),
  graceMs: z.number().int().nonnegative().optional(),
  authority: z.enum(["SERVER", "MARSHAL_RECORDED"]).optional(),
}).strict().superRefine((timing, ctx) => {
  if (timing.mode === "COUNTDOWN" && !timing.durationMs) ctx.addIssue({ code: "custom", message: "Countdown requires durationMs", path: ["durationMs"] });
});

export const VerificationPolicySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("AUTO") }).strict(),
  z.object({ type: z.literal("SELF_DECLARE") }).strict(),
  z.object({ type: z.literal("CAPTAIN") }).strict(),
  z.object({ type: z.literal("MARSHAL"), approvalsRequired: z.number().int().positive().optional() }).strict(),
  z.object({ type: z.literal("JUDGE"), judgesRequired: z.number().int().positive().optional() }).strict(),
  z.object({ type: z.literal("ORGANIZER_FINALIZE") }).strict(),
]);

export const AttemptPolicySchema = z.object({
  maxAttempts: z.number().int().positive().optional(),
  resetScope: z.enum(["NEVER", "ROUND", "DAY", "MANUAL"]).optional(),
  preserveBest: z.boolean().optional(),
  preserveAllResults: z.boolean().default(true),
}).strict();

export const CompletionPolicySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ALL_REQUIRED_BLOCKS") }).strict(),
  z.object({ type: z.literal("ANY_N_BLOCKS"), count: z.number().int().positive() }).strict(),
  z.object({ type: z.literal("VERIFIED") }).strict(),
  z.object({ type: z.literal("RULE_CONTROLLED") }).strict(),
]);

export const ActivityDefinitionSchema = z.object({
  schemaVersion: z.literal(1),
  key: MachineKeySchema,
  title: LocalizedTextSchema,
  description: LocalizedTextSchema.optional(),
  categoryTags: z.array(z.string().min(1)).max(50).default([]),
  participation: ParticipationPolicySchema,
  content: z.array(ActivityBlockSchema).max(TechnicalLimits.maxBlocksPerActivity),
  metrics: z.array(MetricDefinitionSchema).max(200),
  attempts: AttemptPolicySchema,
  timing: TimingPolicySchema,
  verification: VerificationPolicySchema,
  scoring: ScoringDefinitionSchema.optional(),
  rules: z.array(RuleDefinitionSchema).max(TechnicalLimits.maxRulesPerActivity),
  completion: CompletionPolicySchema,
  safety: z.object({
    intensity: z.enum(["LOW", "MODERATE", "HIGH"]).optional(),
    environment: z.array(z.enum(["INDOOR", "OUTDOOR", "WET", "HEAT", "STAIRS", "ROUGH_GROUND"])).optional(),
    notes: z.array(z.string()).optional(),
  }).strict().optional(),
  accessibility: z.object({ notes: z.array(z.string()).optional(), alternativeRoleSupported: z.boolean().optional() }).strict().optional(),
  organizerNotes: z.string().max(10_000).optional(),
  marshalNotes: z.string().max(10_000).optional(),
}).strict().superRefine((definition, ctx) => {
  const blockIds = definition.content.flatMap((block) => block.type === "question_pool" ? [block.id, ...block.questions.map((question) => question.id)] : [block.id]);
  if (new Set(blockIds).size !== blockIds.length) ctx.addIssue({ code: "custom", message: "Block and nested question IDs must be globally unique within an activity", path: ["content"] });
  const metricKeys = definition.metrics.map((metric) => metric.key);
  if (new Set(metricKeys).size !== metricKeys.length) ctx.addIssue({ code: "custom", message: "Metric keys must be unique", path: ["metrics"] });
});

export type ActivityDefinition = z.infer<typeof ActivityDefinitionSchema>;
export type ActivityBlock = z.infer<typeof ActivityBlockSchema>;
export type QuestionBlock = z.infer<typeof QuestionBlockSchema>;
