import { randomBytes } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import { asInputJson } from "@/lib/json";
import { RouteAssignmentSnapshotSchema, RouteModeSchema, RouteStepConfigSchema, type RouteProgressStep } from "@/schemas/flow";
import { buildRouteOrder } from "@/engine/flow/build-route-order";
import { isRouteStepUnlocked, participantStepVisible } from "@/engine/flow/evaluate-unlock";
import { RandomizationService } from "./randomization-service";
import { AuditService } from "./audit-service";

const finishedStates = new Set(["COMPLETED", "SKIPPED"]);

export class RouteService {
  async create(input: { eventId: string; machineKey: string; name: string; mode: string; config?: unknown; actorUserId?: string }) {
    const mode = RouteModeSchema.parse(input.mode.toUpperCase());
    const route = await getPrisma().routePlan.create({ data: { eventId: input.eventId, machineKey: input.machineKey, name: input.name, mode, configJson: input.config === undefined ? undefined : asInputJson(input.config) } });
    if (input.actorUserId) {
      const event = await getPrisma().event.findUniqueOrThrow({ where: { id: input.eventId } });
      await new AuditService().record({ organizationId: event.organizationId, eventId: event.id, actorUserId: input.actorUserId, action: "ROUTE_CREATED", targetType: "RoutePlan", targetId: route.id, after: { mode } });
    }
    return route;
  }

  async replaceSteps(routePlanId: string, steps: Array<{ stationId?: string; activityInstanceId?: string; config?: unknown }>) {
    const route = await getPrisma().routePlan.findUniqueOrThrow({ where: { id: routePlanId } });
    const activeAssignments = await getPrisma().teamRouteAssignment.count({ where: { routePlanId, active: true } });
    if (activeAssignments > 0) throw new Error("Assigned routes are frozen. Create a new route plan instead of editing this one.");
    const prepared = [] as Array<{ stationId?: string; activityInstanceId?: string; config: ReturnType<typeof RouteStepConfigSchema.parse> }>;
    for (const step of steps) {
      if (!step.stationId && !step.activityInstanceId) throw new Error("Route step needs a station or activity target");
      if (step.stationId) {
        const station = await getPrisma().station.findUniqueOrThrow({ where: { id: step.stationId } });
        if (station.eventId !== route.eventId) throw new Error("Route step station belongs to another event");
      }
      if (step.activityInstanceId) {
        const activity = await getPrisma().activityInstance.findUniqueOrThrow({ where: { id: step.activityInstanceId } });
        if (activity.eventId !== route.eventId) throw new Error("Route step activity belongs to another event");
      }
      prepared.push({ ...step, config: RouteStepConfigSchema.parse(step.config ?? {}) });
    }
    return getPrisma().$transaction(async (tx) => {
      await tx.routeStep.deleteMany({ where: { routePlanId } });
      if (prepared.length) await tx.routeStep.createMany({ data: prepared.map((step, index) => ({ routePlanId, sequence: index + 1, stationId: step.stationId, activityInstanceId: step.activityInstanceId, configJson: asInputJson(step.config) })) });
      return tx.routePlan.findUniqueOrThrow({ where: { id: routePlanId }, include: { steps: { orderBy: { sequence: "asc" } } } });
    });
  }

  async assignTeams(input: { routePlanId: string; teamIds: string[]; actorUserId?: string }) {
    const route = await getPrisma().routePlan.findUniqueOrThrow({ where: { id: input.routePlanId }, include: { event: true, steps: { orderBy: { sequence: "asc" } } } });
    const mode = RouteModeSchema.parse(route.mode);
    if (route.steps.length === 0) throw new Error("Route has no steps");
    const teamIds = [...new Set(input.teamIds)];
    const teams = await getPrisma().team.findMany({ where: { id: { in: teamIds }, eventId: route.eventId, status: "ACTIVE" }, orderBy: [{ name: "asc" }, { id: "asc" }] });
    if (teams.length !== teamIds.length) throw new Error("One or more route teams are invalid or belong to another event");
    const baseSteps = route.steps.map((step) => ({ routeStepId: step.id, sequence: step.sequence, stationId: step.stationId ?? undefined, activityInstanceId: step.activityInstanceId ?? undefined, config: RouteStepConfigSchema.parse(step.configJson ?? {}) }));
    const assignments = [];
    for (const [teamIndex, team] of teams.entries()) {
      let seed: string | undefined;
      let ordered = baseSteps;
      if (mode === "RANDOMIZED") {
        seed = randomBytes(16).toString("hex");
        const randomized = await new RandomizationService().shuffleAndRecord({ eventId: route.eventId, purpose: `route-assignment:${route.id}:${team.id}`, seed: seed!, items: baseSteps });
        ordered = randomized.output;
      } else {
        ordered = buildRouteOrder(baseSteps, mode, { teamIndex });
      }
      const snapshot = RouteAssignmentSnapshotSchema.parse({ schemaVersion: 1, routePlanId: route.id, mode, seed, orderedSteps: ordered.map((step, index) => ({ ...step, sequence: index + 1 })) });
      const assignment = await getPrisma().$transaction(async (tx) => {
        await tx.teamRouteAssignment.updateMany({ where: { teamId: team.id, active: true }, data: { active: false, endedAt: new Date() } });
        return tx.teamRouteAssignment.create({ data: { teamId: team.id, routePlanId: route.id, snapshotJson: asInputJson(snapshot), active: true } });
      });
      assignments.push(assignment);
    }
    if (input.actorUserId) await new AuditService().record({ organizationId: route.event.organizationId, eventId: route.eventId, actorUserId: input.actorUserId, action: "ROUTE_ASSIGNED", targetType: "RoutePlan", targetId: route.id, after: { mode, teamIds: teams.map((team) => team.id) } });
    return assignments;
  }

  async progressForTeam(eventId: string, teamId: string) {
    const assignment = await getPrisma().teamRouteAssignment.findFirst({ where: { teamId, active: true, routePlan: { eventId } }, orderBy: { assignedAt: "desc" }, include: { unlockOverrides: true } });
    if (!assignment?.snapshotJson) return null;
    const snapshot = RouteAssignmentSnapshotSchema.parse(assignment.snapshotJson);
    const entry = await getPrisma().participationEntry.findFirst({ where: { eventId, teamId, kind: "TEAM" } });
    const visits = entry ? await getPrisma().stationVisit.findMany({ where: { participationEntryId: entry.id, routeStepId: { in: snapshot.orderedSteps.map((step) => step.routeStepId) } }, orderBy: { createdAt: "asc" } }) : [];
    const completedStepIds = new Set(visits.filter((visit) => visit.state === "COMPLETED").map((visit) => visit.routeStepId).filter(Boolean) as string[]);
    const skippedStepIds = new Set(visits.filter((visit) => visit.state === "SKIPPED").map((visit) => visit.routeStepId).filter(Boolean) as string[]);
    const completedStationIds = new Set<string>(visits.filter((visit) => finishedStates.has(visit.state)).map((visit) => visit.stationId));
    const overrideMap = new Map(assignment.unlockOverrides.map((override) => [override.routeStepId, override.unlocked]));
    const manualUnlockStepIds = new Set<string>(assignment.unlockOverrides.filter((override) => override.unlocked).map((override) => override.routeStepId));
    const orderedIdentity = snapshot.orderedSteps.map((step) => ({ routeStepId: step.routeStepId, stationId: step.stationId }));
    const steps: RouteProgressStep[] = snapshot.orderedSteps.map((step, stepIndex) => {
      const config = RouteStepConfigSchema.parse(step.config ?? {});
      const completed = completedStepIds.has(step.routeStepId);
      const skipped = skippedStepIds.has(step.routeStepId);
      let unlocked = isRouteStepUnlocked(config, { mode: snapshot.mode, stepIndex, orderedSteps: orderedIdentity, completedStepIds, skippedStepIds, completedStationIds, manualUnlockStepIds });
      if (overrideMap.get(step.routeStepId) === false) unlocked = false;
      return { ...step, config, completed, skipped, unlocked, visible: participantStepVisible(config, { unlocked, completed, skipped }) };
    });
    return { assignment, snapshot, steps, visits };
  }

  async resolveStationAccess(input: { eventId: string; teamId: string; stationId: string }) {
    const progress = await this.progressForTeam(input.eventId, input.teamId);
    if (!progress) return { allowed: true as const, routeStepId: undefined, reason: "NO_ASSIGNED_ROUTE" };
    const candidates = progress.steps.filter((step) => step.stationId === input.stationId && !step.completed && !step.skipped);
    const accessible = candidates.find((step) => step.unlocked);
    if (accessible) return { allowed: true as const, routeStepId: accessible.routeStepId, reason: "UNLOCKED_ROUTE_STEP" };
    if (candidates.length > 0) return { allowed: false as const, reason: "ROUTE_STEP_LOCKED" };
    return { allowed: false as const, reason: "STATION_NOT_ON_ACTIVE_ROUTE" };
  }

  async setUnlockOverride(input: { eventId: string; teamId: string; routeStepId: string; unlocked: boolean; reason: string; actorUserId: string }) {
    const reason = input.reason.trim();
    if (!reason) throw new Error("Override reason is required");
    const assignment = await getPrisma().teamRouteAssignment.findFirst({ where: { teamId: input.teamId, active: true, routePlan: { eventId: input.eventId } }, include: { routePlan: { include: { event: true } } } });
    if (!assignment) throw new Error("Team has no active route assignment");
    const step = await getPrisma().routeStep.findUniqueOrThrow({ where: { id: input.routeStepId } });
    if (step.routePlanId !== assignment.routePlanId) throw new Error("Route step is not part of the team route");
    const override = await getPrisma().routeUnlockOverride.upsert({ where: { teamRouteAssignmentId_routeStepId: { teamRouteAssignmentId: assignment.id, routeStepId: step.id } }, update: { unlocked: input.unlocked, reason, actorUserId: input.actorUserId }, create: { teamRouteAssignmentId: assignment.id, routeStepId: step.id, unlocked: input.unlocked, reason, actorUserId: input.actorUserId } });
    await new AuditService().record({ organizationId: assignment.routePlan.event.organizationId, eventId: input.eventId, actorUserId: input.actorUserId, action: "ROUTE_UNLOCK_OVERRIDE", targetType: "RouteStep", targetId: step.id, reason, after: { teamId: input.teamId, unlocked: input.unlocked } });
    return override;
  }
}
