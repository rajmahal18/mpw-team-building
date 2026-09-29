import { createHash } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import { ActivityDefinitionSchema } from "@/schemas/activity";
import { evaluateScoringDefinition } from "@/engine/scoring/evaluate-score";
import { DomainEventService } from "./domain-event-service";

function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 24);
}

function systemSubmissionMetrics(submissions: Array<{ status: string; validationJson: unknown }>) {
  const accepted = submissions.filter((submission) => submission.status === "ACCEPTED");
  let graded = 0;
  let correct = 0;
  let earned = 0;
  let possible = 0;
  for (const submission of accepted) {
    const validation = submission.validationJson as { gradable?: boolean; correct?: boolean; earnedPoints?: number; maxPoints?: number } | null;
    if (!validation?.gradable) continue;
    graded += 1;
    if (validation.correct) correct += 1;
    if (typeof validation.earnedPoints === "number" && Number.isFinite(validation.earnedPoints)) earned += validation.earnedPoints;
    if (typeof validation.maxPoints === "number" && Number.isFinite(validation.maxPoints)) possible += validation.maxPoints;
  }
  return {
    system_submission_count: accepted.length,
    system_graded_count: graded,
    system_correct_count: correct,
    system_submission_points: earned,
    system_possible_points: possible,
    system_percent_correct: graded ? (correct / graded) * 100 : 0,
  };
}

export class ScoringService {
  async tryScoreRun(activityRunId: string) {
    try { return await this.scoreRun(activityRunId); }
    catch (error) {
      if (error instanceof Error && (/^Metric .+ is not numeric$/.test(error.message) || error.message.includes("Scoring expression produced"))) return null;
      throw error;
    }
  }

  async scoreRun(activityRunId: string) {
    const run = await getPrisma().activityRun.findUniqueOrThrow({
      where: { id: activityRunId },
      include: { definitionVersion: true, metrics: { orderBy: { recordedAt: "asc" } }, submissions: { orderBy: { createdAt: "asc" } } },
    });
    const definition = ActivityDefinitionSchema.parse(run.definitionVersion.definitionJson);
    if (!definition.scoring) return null;

    const metrics: Record<string, unknown> = { ...systemSubmissionMetrics(run.submissions) };
    if (run.startedAt && (run.completedAt || run.submittedAt)) metrics.system_elapsed_ms = (run.completedAt ?? run.submittedAt)!.getTime() - run.startedAt.getTime();
    for (const metric of run.metrics) metrics[metric.metricKey] = metric.valueJson;
    const amount = evaluateScoringDefinition(definition.scoring, { metrics, run: { attemptNo: run.attemptNo, status: run.state } });
    const calculationHash = stableHash({ definitionVersionId: run.definitionVersion.id, outputKey: definition.scoring.outputKey, metrics });
    const idempotencyKey = `derived:${run.id}:${definition.scoring.outputKey}:${calculationHash}`;

    const existing = await getPrisma().scoreEntry.findUnique({ where: { idempotencyKey } });
    if (existing) return existing;

    const previousDerived = await getPrisma().scoreEntry.findMany({
      where: { activityRunId: run.id, dimensionKey: definition.scoring.outputKey, entryType: "DERIVED" },
      orderBy: { createdAt: "desc" },
    });
    const priorReversals = previousDerived.length ? await getPrisma().scoreEntry.findMany({ where: { reversalOfId: { in: previousDerived.map((row)=>row.id) }, entryType: "REVERSAL" } }) : [];
    const alreadyReversed = new Set(priorReversals.map((row)=>row.reversalOfId).filter(Boolean));
    const previous = previousDerived.find((row)=>!alreadyReversed.has(row.id));

    const score = await getPrisma().$transaction(async (tx) => {
      if (previous) {
        await tx.scoreEntry.create({
          data: {
            eventId: run.eventId,
            participationEntryId: run.participationEntryId,
            activityInstanceId: run.activityInstanceId,
            activityRunId: run.id,
            dimensionKey: definition.scoring!.outputKey,
            amount: -Number(previous.amount.toString()),
            entryType: "REVERSAL",
            reason: `Recompute ${definition.scoring!.outputLabel}`,
            reversalOfId: previous.id,
            idempotencyKey: `reversal:${previous.id}:${calculationHash}`,
          },
        });
      }
      return tx.scoreEntry.create({
        data: {
          eventId: run.eventId,
          participationEntryId: run.participationEntryId,
          activityInstanceId: run.activityInstanceId,
          activityRunId: run.id,
          dimensionKey: definition.scoring!.outputKey,
          amount,
          entryType: "DERIVED",
          reason: definition.scoring!.outputLabel,
          provenanceJson: { calculationHash, definitionVersionId: run.definitionVersion.id, systemMetricKeys: Object.keys(metrics).filter((key)=>key.startsWith("system_")) },
          idempotencyKey,
        },
      });
    });

    await new DomainEventService().emit({ id: `score:${idempotencyKey}`, eventId: run.eventId, type: "SCORE_ENTRY_CREATED", aggregateType: "ActivityRun", aggregateId: run.id, payload: { scoreEntryId: score.id, dimensionKey: definition.scoring.outputKey, amount, calculationHash } });
    return score;
  }
}
