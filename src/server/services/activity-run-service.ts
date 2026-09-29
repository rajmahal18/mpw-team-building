import { randomBytes } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import { asInputJson } from "@/lib/json";
import { ActivityDefinitionSchema, type ActivityBlock } from "@/schemas/activity";
import { blockAcceptsSubmission } from "@/engine/blocks/registry";
import { RandomizationService } from "./randomization-service";
import { DomainEventService } from "./domain-event-service";

export class ActivityRunService {
  async ensureTeamEntry(eventId: string, teamId: string) {
    const existing = await getPrisma().participationEntry.findFirst({ where: { eventId, teamId, kind: "TEAM" } });
    return existing ?? getPrisma().participationEntry.create({ data: { eventId, teamId, kind: "TEAM" } });
  }

  async ensureActiveTeamEntries(eventId: string) {
    const teams = await getPrisma().team.findMany({ where: { eventId, status: "ACTIVE" }, select: { id: true } });
    const entries = [];
    for (const team of teams) entries.push(await this.ensureTeamEntry(eventId, team.id));
    return entries;
  }

  async tryComplete(activityRunId: string) {
    const run = await getPrisma().activityRun.findUniqueOrThrow({
      where: { id: activityRunId },
      include: { definitionVersion: true, submissions: { where: { status: "ACCEPTED" } } },
    });
    if (["COMPLETED", "FINALIZED", "FAILED", "SKIPPED", "CANCELLED", "VOID"].includes(run.state)) return run;
    const definition = ActivityDefinitionSchema.parse(run.definitionVersion.definitionJson);
    if (definition.completion.type === "VERIFIED" || definition.completion.type === "RULE_CONTROLLED") return run;

    const generated = run.generatedContentJson as { questionPools?: Record<string, string[]> } | null;
    const selectedByPool = generated?.questionPools ?? {};
    const interactive: ActivityBlock[] = [];
    for (const block of definition.content) {
      if (block.type === "question_pool") {
        const selected = selectedByPool[block.id] ?? (block.mode === "ALL" ? block.questions.map((q) => q.id) : []);
        for (const question of block.questions) if (selected.includes(question.id)) interactive.push(question);
      } else if (blockAcceptsSubmission(block)) interactive.push(block);
    }
    const submittedIds = new Set(run.submissions.map((submission) => submission.blockId));
    let complete = false;
    if (definition.completion.type === "ANY_N_BLOCKS") {
      complete = interactive.filter((block) => submittedIds.has(block.id)).length >= definition.completion.count;
    } else {
      const required = interactive.filter((block) => block.required === true);
      const expected = required.length > 0 ? required : interactive;
      complete = expected.length === 0 || expected.every((block) => submittedIds.has(block.id));
    }
    if (!complete) return run;

    const completed = await getPrisma().activityRun.update({
      where: { id: run.id },
      data: { state: "COMPLETED", submittedAt: run.submittedAt ?? new Date(), completedAt: run.completedAt ?? new Date() },
    });
    await new DomainEventService().emit({
      eventId: run.eventId,
      type: "ACTIVITY_RUN_COMPLETED",
      aggregateType: "ActivityRun",
      aggregateId: run.id,
      payload: { completionType: definition.completion.type },
    });
    return completed;
  }

  async start(input: { activityInstanceId: string; participationEntryId: string }) {
    const activity = await getPrisma().activityInstance.findUniqueOrThrow({ where: { id: input.activityInstanceId }, include: { event: true } });
    if (!activity.currentVersionId) throw new Error("Activity has no published definition");
    const [entry, version] = await Promise.all([
      getPrisma().participationEntry.findUniqueOrThrow({ where: { id: input.participationEntryId } }),
      getPrisma().activityDefinitionVersion.findFirst({ where: { id: activity.currentVersionId, activityInstanceId: activity.id } }),
    ]);
    if (entry.eventId !== activity.eventId) throw new Error("Participation entry belongs to another event");
    if (!version) throw new Error("Activity current-version pointer is invalid");
    const definition = ActivityDefinitionSchema.parse(version.definitionJson);
    const priorCount = await getPrisma().activityRun.count({ where: { activityInstanceId: activity.id, participationEntryId: entry.id } });
    const attemptNo = priorCount + 1;
    const runSeed = randomBytes(16).toString("hex");
    const questionPools: Record<string, string[]> = {};
    const randomization = new RandomizationService();

    for (const block of definition.content) {
      if (block.type !== "question_pool") continue;
      const ids = block.questions.map((question) => question.id);
      let selected = ids;
      if (block.mode === "RANDOM_N") {
        const shuffled = await randomization.shuffleAndRecord({ eventId: activity.eventId, purpose: `question-pool-select:${activity.id}:${entry.id}:${attemptNo}:${block.id}`, seed: `${runSeed}:${block.id}:select`, items: ids });
        selected = shuffled.output.slice(0, block.drawCount ?? ids.length);
      }
      if (block.shuffleSelected) {
        const shuffled = await randomization.shuffleAndRecord({ eventId: activity.eventId, purpose: `question-pool-order:${activity.id}:${entry.id}:${attemptNo}:${block.id}`, seed: `${runSeed}:${block.id}:order`, items: selected });
        selected = shuffled.output;
      }
      questionPools[block.id] = selected;
    }

    const run = await getPrisma().activityRun.create({
      data: {
        eventId: activity.eventId,
        activityInstanceId: activity.id,
        activityDefinitionVersionId: activity.currentVersionId,
        participationEntryId: entry.id,
        attemptNo,
        state: "IN_PROGRESS",
        startedAt: new Date(),
        generatedContentJson: Object.keys(questionPools).length ? asInputJson({ schemaVersion: 1, seed: runSeed, questionPools }) : undefined,
      },
    });
    await new DomainEventService().emit({ eventId: run.eventId, type: "ACTIVITY_RUN_STARTED", aggregateType: "ActivityRun", aggregateId: run.id, payload: { activityInstanceId: run.activityInstanceId, participationEntryId: run.participationEntryId, definitionVersionId: run.activityDefinitionVersionId, randomizedQuestionPools: Object.keys(questionPools) } });
    return run;
  }
}
