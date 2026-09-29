import { getPrisma } from "@/lib/prisma";
import { ActivityDefinitionSchema } from "@/schemas/activity";
import { participantActivityProjection } from "@/engine/blocks/registry";
import { ActivityRunService } from "./activity-run-service";
import { RouteService } from "./route-service";
import { assertParticipantEventInteractive } from "@/server/security/participant-access";

export class ParticipantActivityService {
  async authorize(input: { eventId: string; teamId: string; activityInstanceId: string; stationId?: string }) {
    const event = await getPrisma().event.findUniqueOrThrow({ where: { id: input.eventId }, select: { state: true } });
    assertParticipantEventInteractive(event.state);
    const activity = await getPrisma().activityInstance.findFirst({ where: { id: input.activityInstanceId, eventId: input.eventId, status: "ACTIVE" } });
    if (!activity) throw new Error("Activity is unavailable");

    if (input.stationId) {
      const assignment = await getPrisma().stationActivityAssignment.findFirst({ where: { stationId: input.stationId, activityInstanceId: activity.id } });
      if (!assignment) throw new Error("Activity is not assigned to this station");
      const entry = await getPrisma().participationEntry.findFirst({ where: { eventId: input.eventId, teamId: input.teamId, kind: "TEAM" } });
      if (!entry) throw new Error("Team participation entry is missing");
      const visit = await getPrisma().stationVisit.findFirst({
        where: { stationId: input.stationId, participationEntryId: entry.id, state: { in: ["ARRIVED", "ACTIVE", "CALLED"] } },
        orderBy: { createdAt: "desc" },
      });
      if (!visit) throw new Error("Check in at the station before opening this activity");
      return activity;
    }

    const progress = await new RouteService().progressForTeam(input.eventId, input.teamId);
    if (progress) {
      const directStep = progress.steps.find((step) => step.activityInstanceId === activity.id && step.unlocked && !step.completed && !step.skipped);
      if (directStep) return activity;
    }

    const [stationRefs, routeRefs] = await Promise.all([
      getPrisma().stationActivityAssignment.count({ where: { activityInstanceId: activity.id } }),
      getPrisma().routeStep.count({ where: { activityInstanceId: activity.id } }),
    ]);
    if (stationRefs === 0 && routeRefs === 0) return activity;
    throw new Error("This activity is not currently unlocked for your team");
  }

  async getOrStart(input: { eventId: string; teamId: string; activityInstanceId: string; stationId?: string }) {
    const activity = await this.authorize(input);
    const runService = new ActivityRunService();
    const entry = await runService.ensureTeamEntry(input.eventId, input.teamId);
    let run = await getPrisma().activityRun.findFirst({
      where: { activityInstanceId: activity.id, participationEntryId: entry.id, state: { in: ["CREATED", "ELIGIBLE", "IN_PROGRESS", "PAUSED", "SUBMITTED", "PENDING_VERIFICATION"] } },
      orderBy: { attemptNo: "desc" },
      include: { definitionVersion: true, submissions: { orderBy: { createdAt: "asc" } }, mediaAssets: true },
    });
    if (!run) {
      await runService.start({ activityInstanceId: activity.id, participationEntryId: entry.id });
      run = await getPrisma().activityRun.findFirstOrThrow({
        where: { activityInstanceId: activity.id, participationEntryId: entry.id, state: "IN_PROGRESS" },
        orderBy: { attemptNo: "desc" },
        include: { definitionVersion: true, submissions: { orderBy: { createdAt: "asc" } }, mediaAssets: true },
      });
    }
    const definition = ActivityDefinitionSchema.parse(run.definitionVersion.definitionJson);
    const generated = run.generatedContentJson as { questionPools?: Record<string, string[]> } | null;
    return {
      activity,
      run,
      projection: participantActivityProjection(definition, { questionPools: generated?.questionPools }),
    };
  }
}
