import { z } from "zod";
import type { ActivityBlock, ActivityDefinition } from "@/schemas/activity";

export type BlockPlugin = {
  type: ActivityBlock["type"];
  submissionSchema?: z.ZodType;
  sanitizeForParticipant: (block: ActivityBlock) => unknown;
};

function publicBase(block: ActivityBlock) {
  return block;
}

const stripValidation = (block: ActivityBlock) => {
  if (block.type === "single_select" || block.type === "multi_select") {
    const { validation: _validation, ...safe } = block;
    return { ...safe, choices: block.choices.map(({ organizerNote: _organizerNote, ...choice }) => choice) };
  }
  if (block.type === "text_input" || block.type === "textarea" || block.type === "fill_blank") {
    const { matcher: _matcher, ...safe } = block;
    return safe;
  }
  if (block.type === "number_input") {
    const { acceptance: _acceptance, ...safe } = block;
    return safe;
  }
  if (block.type === "ordering") {
    const { validation: _validation, ...safe } = block;
    return safe;
  }
  if (block.type === "matching") {
    const { validation: _validation, ...safe } = block;
    return safe;
  }
  if (block.type === "question_pool") {
    return { ...block, questions: block.questions.map((question) => stripValidation(question)) };
  }
  return publicBase(block);
};

const submissionSchemas: Partial<Record<ActivityBlock["type"], z.ZodType>> = {
  single_select: z.object({ choiceId: z.string().min(1) }).strict(),
  multi_select: z.object({ choiceIds: z.array(z.string().min(1)).min(1) }).strict(),
  text_input: z.object({ value: z.string() }).strict(),
  textarea: z.object({ value: z.string() }).strict(),
  fill_blank: z.object({ value: z.string() }).strict(),
  number_input: z.object({ value: z.number().finite() }).strict(),
  ordering: z.object({ orderedIds: z.array(z.string().min(1)).min(2) }).strict(),
  matching: z.object({ pairs: z.array(z.object({ leftId: z.string().min(1), rightId: z.string().min(1) }).strict()).min(1) }).strict(),
  media_submission: z.object({ assetIds: z.array(z.string().min(1)).min(1) }).strict(),
  manual_metric: z.object({ value: z.number().finite() }).strict(),
  marshal_decision: z.object({ optionId: z.string().min(1) }).strict(),
  acknowledge: z.object({ acknowledged: z.literal(true) }).strict(),
  judge_rubric: z.object({ scores: z.record(z.string(), z.number().finite()) }).strict(),
};

export const blockRegistry = new Map<ActivityBlock["type"], BlockPlugin>(
  ([
    "rich_text",
    "media_display",
    "single_select",
    "multi_select",
    "text_input",
    "textarea",
    "fill_blank",
    "number_input",
    "ordering",
    "matching",
    "question_pool",
    "media_submission",
    "manual_metric",
    "marshal_decision",
    "acknowledge",
    "judge_rubric",
  ] as const).map((type) => [type, { type, submissionSchema: submissionSchemas[type], sanitizeForParticipant: stripValidation }])
);

export function participantProjection(block: ActivityBlock): unknown {
  const plugin = blockRegistry.get(block.type);
  if (!plugin) throw new Error(`Unsupported block type: ${block.type}`);
  return plugin.sanitizeForParticipant(block);
}

export function participantActivityProjection(definition: ActivityDefinition, options?: { questionPools?: Record<string, string[]>; includeUnselectedPoolQuestions?: boolean }) {
  const content = definition.content.map((block) => {
    if (block.type !== "question_pool") return participantProjection(block);
    const selectedIds = options?.questionPools?.[block.id];
    const visibleQuestions = selectedIds
      ? selectedIds.map((id) => block.questions.find((question) => question.id === id)).filter((question): question is NonNullable<typeof question> => Boolean(question))
      : options?.includeUnselectedPoolQuestions ? block.questions : [];
    const safe = participantProjection({ ...block, questions: visibleQuestions });
    return { ...(safe as Record<string, unknown>), availableQuestionCount: block.questions.length };
  });
  return {
    schemaVersion: definition.schemaVersion,
    key: definition.key,
    title: definition.title,
    description: definition.description,
    categoryTags: definition.categoryTags,
    participation: definition.participation,
    content,
    attempts: definition.attempts,
    timing: definition.timing,
    verification: definition.verification,
    completion: definition.completion,
    safety: definition.safety,
    accessibility: definition.accessibility,
  };
}

export function findActivityBlock(definition: ActivityDefinition, blockId: string): ActivityBlock | undefined {
  for (const block of definition.content) {
    if (block.id === blockId) return block;
    if (block.type === "question_pool") {
      const nested = block.questions.find((question) => question.id === blockId);
      if (nested) return nested;
    }
  }
  return undefined;
}

export function findQuestionPoolIdForQuestion(definition: ActivityDefinition, blockId: string): string | undefined {
  for (const block of definition.content) {
    if (block.type === "question_pool" && block.questions.some((question) => question.id === blockId)) return block.id;
  }
  return undefined;
}

export function validateBlockSubmission(block: ActivityBlock, payload: unknown): unknown {
  const plugin = blockRegistry.get(block.type);
  if (!plugin?.submissionSchema) {
    if (block.required) throw new Error(`Block ${block.id} does not accept a submission`);
    return payload;
  }
  return plugin.submissionSchema.parse(payload);
}

export function blockAcceptsSubmission(block: ActivityBlock): boolean {
  return Boolean(blockRegistry.get(block.type)?.submissionSchema);
}
