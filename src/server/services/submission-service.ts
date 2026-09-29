import { getPrisma } from "@/lib/prisma";
import { asInputJson } from "@/lib/json";
import { ActivityDefinitionSchema } from "@/schemas/activity";
import { findActivityBlock, findQuestionPoolIdForQuestion, validateBlockSubmission } from "@/engine/blocks/registry";
import { gradeBlockSubmission } from "@/engine/grading/grade-block";
import { DomainEventService } from "./domain-event-service";
import { MetricService } from "./metric-service";
import { ScoringService } from "./scoring-service";
import { JudgeScoringService } from "./judge-scoring-service";
import { MediaService } from "./media-service";
import { ActivityRunService } from "./activity-run-service";

export class SubmissionService {
  async submit(input: { activityRunId: string; blockId: string; payload: unknown; idempotencyKey: string }) {
    const run = await getPrisma().activityRun.findUniqueOrThrow({ where: { id: input.activityRunId }, include: { definitionVersion: true } });
    const existing = await getPrisma().submission.findUnique({ where: { activityRunId_idempotencyKey: { activityRunId: run.id, idempotencyKey: input.idempotencyKey } } });
    if (existing) return existing;
    const definition = ActivityDefinitionSchema.parse(run.definitionVersion.definitionJson);
    const block = findActivityBlock(definition, input.blockId);
    if (!block) throw new Error("Unknown block");
    const poolId = findQuestionPoolIdForQuestion(definition, input.blockId);
    if (poolId) {
      const generated = run.generatedContentJson as { questionPools?: Record<string, string[]> } | null;
      const selected = generated?.questionPools?.[poolId] ?? [];
      if (!selected.includes(input.blockId)) throw new Error("Question was not selected for this activity run");
    }
    if ("maxAttempts" in block && block.maxAttempts) {
      const usedAttempts = await getPrisma().submission.count({ where: { activityRunId: run.id, blockId: input.blockId } });
      if (usedAttempts >= block.maxAttempts) throw new Error("Question attempt limit reached");
    }
    const parsedPayload = validateBlockSubmission(block, input.payload);
    if (block.type === "media_submission") {
      const assetIds = (parsedPayload as { assetIds: string[] }).assetIds;
      if (assetIds.length < block.minItems || assetIds.length > block.maxItems) throw new Error(`Media submission requires ${block.minItems} to ${block.maxItems} file(s)`);
      await new MediaService().assertAssetsForSubmission({ activityRunId: run.id, blockId: block.id, assetIds });
    }
    const validation = gradeBlockSubmission(block, parsedPayload);
    const submission = await getPrisma().submission.upsert({
      where: { activityRunId_idempotencyKey: { activityRunId: run.id, idempotencyKey: input.idempotencyKey } },
      update: {},
      create: {
        activityRunId: run.id,
        blockId: input.blockId,
        idempotencyKey: input.idempotencyKey,
        status: block.type === "media_submission" && block.requireMarshalReview ? "NEEDS_REVIEW" : "ACCEPTED",
        payloadJson: asInputJson(parsedPayload),
        validationJson: asInputJson(validation),
      },
    });
    await new DomainEventService().emit({ id: `submission:${run.id}:${input.idempotencyKey}`, eventId: run.eventId, type: "SUBMISSION_ACCEPTED", aggregateType: "ActivityRun", aggregateId: run.id, payload: { submissionId: submission.id, blockId: input.blockId, validation } });
    if (block.type === "judge_rubric") {
      await new JudgeScoringService().recompute({ activityRunId: run.id, blockId: block.id });
    } else if (block.type === "manual_metric") {
      await new MetricService().record({ activityRunId: run.id, metricKey: block.metricKey, value: (parsedPayload as { value: number }).value, source: "MARSHAL" });
      await new ScoringService().tryScoreRun(run.id);
    } else if (block.type === "number_input" && block.metricKey) {
      await new MetricService().record({ activityRunId: run.id, metricKey: block.metricKey, value: (parsedPayload as { value: number }).value, source: "SUBMISSION" });
      await new ScoringService().tryScoreRun(run.id);
    } else {
      await new ScoringService().tryScoreRun(run.id);
    }
    await new ActivityRunService().tryComplete(run.id);
    return submission;
  }
}
