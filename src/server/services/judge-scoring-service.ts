import { getPrisma } from "@/lib/prisma";
import { ActivityDefinitionSchema } from "@/schemas/activity";
import { aggregateJudgeScores, normalizeJudgeRubric } from "@/engine/scoring/rubric";
import { MetricService } from "./metric-service";
import { ScoringService } from "./scoring-service";

export class JudgeScoringService {
  async recompute(input: { activityRunId: string; blockId: string; actorUserId?: string }) {
    const run = await getPrisma().activityRun.findUniqueOrThrow({ where: { id: input.activityRunId }, include: { definitionVersion: true, submissions: { where: { blockId: input.blockId, status: "ACCEPTED" }, orderBy: { createdAt: "asc" } } } });
    const definition = ActivityDefinitionSchema.parse(run.definitionVersion.definitionJson);
    const block = definition.content.find((item)=>item.id===input.blockId);
    if (!block || block.type !== "judge_rubric") throw new Error("Judge rubric block not found");
    const judgeValues = run.submissions.map((submission)=>normalizeJudgeRubric(block.criteria, submission.payloadJson as { scores: Record<string, number> }));
    if (!judgeValues.length) return null;
    const value = aggregateJudgeScores(judgeValues, block.aggregateJudges);
    const metric = await new MetricService().record({ activityRunId: run.id, metricKey: block.rubricKey, value, source: "JUDGE", recordedById: input.actorUserId });
    await new ScoringService().tryScoreRun(run.id);
    return metric;
  }
}
