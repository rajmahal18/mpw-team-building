import { getPrisma } from "@/lib/prisma";
import { asInputJson } from "@/lib/json";
import { StationConfigSchema } from "@/schemas/flow";
import { nextCheckInState } from "@/engine/flow/station-capacity";
import { verifyCheckpointToken } from "@/server/security/checkpoint-token";
import { DomainEventService } from "./domain-event-service";
import { CheckpointCredentialService } from "./checkpoint-credential-service";
import { RouteService } from "./route-service";
import { AuditService } from "./audit-service";

const nonTerminalStates = ["EXPECTED", "QUEUED", "CALLED", "ARRIVED", "ACTIVE"] as const;
const reservedStates = ["CALLED", "ARRIVED", "ACTIVE"] as const;

function metadataObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

async function normalizeQueue(tx: any, stationId: string) {
  const queued = await tx.stationVisit.findMany({ where: { stationId, state: "QUEUED" }, orderBy: [{ queuePosition: "asc" }, { checkedInAt: "asc" }, { createdAt: "asc" }] });
  for (const [index, visit] of queued.entries()) {
    const expected = index + 1;
    if (visit.queuePosition !== expected) await tx.stationVisit.update({ where: { id: visit.id }, data: { queuePosition: expected } });
  }
}

async function promoteNextQueued(tx: any, station: { id: string; capacity: number | null; configJson: unknown }) {
  const config = StationConfigSchema.parse(station.configJson ?? {});
  if (!config.autoCallNext || config.queuePolicy !== "FIFO") return null;
  const reserved = await tx.stationVisit.count({ where: { stationId: station.id, state: { in: [...reservedStates] } } });
  if (station.capacity != null && reserved >= station.capacity) return null;
  const next = await tx.stationVisit.findFirst({ where: { stationId: station.id, state: "QUEUED" }, orderBy: [{ queuePosition: "asc" }, { createdAt: "asc" }] });
  if (!next) return null;
  const called = await tx.stationVisit.update({ where: { id: next.id }, data: { state: "CALLED", calledAt: new Date(), queuePosition: null } });
  await normalizeQueue(tx, station.id);
  return called;
}

export class StationService {
  async create(input: { eventId: string; machineKey: string; name: string; capacity?: number; config?: unknown; actorUserId?: string }) {
    if (input.capacity != null && (!Number.isInteger(input.capacity) || input.capacity < 1)) throw new Error("Station capacity must be at least 1");
    const config = StationConfigSchema.parse(input.config ?? {});
    const station = await getPrisma().station.create({ data: { eventId: input.eventId, machineKey: input.machineKey, name: input.name, capacity: input.capacity, configJson: asInputJson(config) } });
    if (input.actorUserId) {
      const event = await getPrisma().event.findUniqueOrThrow({ where: { id: input.eventId } });
      await new AuditService().record({ organizationId: event.organizationId, eventId: event.id, actorUserId: input.actorUserId, action: "STATION_CREATED", targetType: "Station", targetId: station.id, after: { machineKey: station.machineKey, capacity: station.capacity } });
    }
    return station;
  }

  async update(input: { stationId: string; name?: string; capacity?: number | null; config?: unknown; actorUserId: string }) {
    const station = await getPrisma().station.findUniqueOrThrow({ where: { id: input.stationId }, include: { event: true } });
    if (input.capacity != null && (!Number.isInteger(input.capacity) || input.capacity < 1)) throw new Error("Station capacity must be at least 1");
    const config = input.config === undefined ? undefined : StationConfigSchema.parse(input.config);
    const updated = await getPrisma().station.update({ where: { id: station.id }, data: { name: input.name?.trim() || undefined, capacity: input.capacity, configJson: config === undefined ? undefined : asInputJson(config) } });
    await new AuditService().record({ organizationId: station.event.organizationId, eventId: station.eventId, actorUserId: input.actorUserId, action: "STATION_UPDATED", targetType: "Station", targetId: station.id, before: { name: station.name, capacity: station.capacity, config: station.configJson }, after: { name: updated.name, capacity: updated.capacity, config: updated.configJson } });
    return updated;
  }

  async assignActivity(input: { stationId: string; activityInstanceId: string; sortOrder?: number; config?: unknown }) {
    const [station, activity] = await Promise.all([getPrisma().station.findUniqueOrThrow({ where: { id: input.stationId } }), getPrisma().activityInstance.findUniqueOrThrow({ where: { id: input.activityInstanceId } })]);
    if (station.eventId !== activity.eventId) throw new Error("Station and activity belong to different events");
    return getPrisma().stationActivityAssignment.upsert({ where: { stationId_activityInstanceId: { stationId: station.id, activityInstanceId: activity.id } }, update: { sortOrder: input.sortOrder ?? 0, configJson: input.config === undefined ? undefined : asInputJson(input.config) }, create: { stationId: station.id, activityInstanceId: activity.id, sortOrder: input.sortOrder ?? 0, configJson: input.config === undefined ? undefined : asInputJson(input.config) } });
  }

  async unassignActivity(stationId: string, activityInstanceId: string) {
    return getPrisma().stationActivityAssignment.delete({ where: { stationId_activityInstanceId: { stationId, activityInstanceId } } });
  }

  async assignStaff(input: { stationId: string; userAccountId: string; roleKey?: string; actorUserId: string }) {
    const station = await getPrisma().station.findUniqueOrThrow({ where: { id: input.stationId }, include: { event: true } });
    const hasEventRole = await getPrisma().eventRoleAssignment.findFirst({ where: { userAccountId: input.userAccountId, role: { eventId: station.eventId } } });
    if (!hasEventRole) throw new Error("Station staff member has no role in this event");
    const assignment = await getPrisma().stationStaffAssignment.upsert({ where: { stationId_userAccountId_roleKey: { stationId: station.id, userAccountId: input.userAccountId, roleKey: input.roleKey ?? "marshal" } }, update: { active: true, endedAt: null }, create: { stationId: station.id, userAccountId: input.userAccountId, roleKey: input.roleKey ?? "marshal" } });
    await new AuditService().record({ organizationId: station.event.organizationId, eventId: station.eventId, actorUserId: input.actorUserId, action: "STATION_STAFF_ASSIGNED", targetType: "StationStaffAssignment", targetId: assignment.id, after: { stationId: station.id, userAccountId: input.userAccountId, roleKey: assignment.roleKey } });
    return assignment;
  }

  async setState(stationId: string, to: "DRAFT" | "READY" | "OPEN" | "PAUSED" | "CLOSED" | "DISABLED", actorUserId?: string) {
    const station = await getPrisma().station.findUniqueOrThrow({ where: { id: stationId }, include: { event: true } });
    const allowed: Record<string, string[]> = { DRAFT: ["READY", "DISABLED"], READY: ["DRAFT", "OPEN", "DISABLED"], OPEN: ["PAUSED", "CLOSED", "DISABLED"], PAUSED: ["OPEN", "CLOSED", "DISABLED"], CLOSED: ["OPEN"], DISABLED: ["READY"] };
    if (!allowed[station.status]?.includes(to)) throw new Error(`Invalid station transition ${station.status} -> ${to}`);
    const updated = await getPrisma().station.update({ where: { id: stationId }, data: { status: to } });
    if (actorUserId) await new AuditService().record({ organizationId: station.event.organizationId, eventId: station.eventId, actorUserId, action: `STATION_${to}`, targetType: "Station", targetId: station.id, before: { status: station.status }, after: { status: to } });
    return updated;
  }

  async checkInWithToken(input: { token: string; eventId: string; teamId: string }) {
    const payload = verifyCheckpointToken(input.token);
    if (payload.eventId !== input.eventId) throw new Error("Checkpoint belongs to another event");
    await new CheckpointCredentialService().validate(payload);
    const [event, station, team] = await Promise.all([getPrisma().event.findUniqueOrThrow({ where: { id: input.eventId } }), getPrisma().station.findUniqueOrThrow({ where: { id: payload.stationId } }), getPrisma().team.findUniqueOrThrow({ where: { id: input.teamId } })]);
    if (station.eventId !== event.id || team.eventId !== event.id) throw new Error("Cross-event check-in rejected");
    if (event.state !== "LIVE") throw new Error("Event is not live");
    if (station.status !== "OPEN") throw new Error("Station is not open");
    const entry = await getPrisma().participationEntry.findFirst({ where: { eventId: event.id, teamId: team.id, kind: "TEAM" } }) ?? await getPrisma().participationEntry.create({ data: { eventId: event.id, teamId: team.id, kind: "TEAM" } });
    const checkInKey = `${entry.id}:${payload.credentialId}`;
    const byCredential = await getPrisma().stationVisit.findUnique({ where: { checkInKey } });
    if (byCredential) return { visit: byCredential, station, team };
    const existingOverrideVisit = await getPrisma().stationVisit.findFirst({ where: { stationId: station.id, participationEntryId: entry.id, state: { in: [...nonTerminalStates] } }, orderBy: { createdAt: "desc" } });
    if (existingOverrideVisit) return { visit: existingOverrideVisit, station, team };

    const access = await new RouteService().resolveStationAccess({ eventId: event.id, teamId: team.id, stationId: station.id });
    if (!access.allowed) throw new Error(access.reason === "ROUTE_STEP_LOCKED" ? "This checkpoint is still locked for your team" : "This checkpoint is not on your team's active route");

    const reserved = await getPrisma().stationVisit.count({ where: { stationId: station.id, state: { in: [...reservedStates] } } });
    const state = nextCheckInState(station.capacity, reserved);
    const queuePosition = state === "QUEUED" ? ((await getPrisma().stationVisit.aggregate({ where: { stationId: station.id, state: "QUEUED" }, _max: { queuePosition: true } }))._max.queuePosition ?? 0) + 1 : null;
    const visit = await getPrisma().stationVisit.create({ data: { eventId: event.id, stationId: station.id, participationEntryId: entry.id, routeStepId: access.routeStepId, state, queuePosition, checkInKey, checkedInAt: new Date(), metadataJson: asInputJson({ credentialId: payload.credentialId, accessReason: access.reason }) } });
    await new DomainEventService().emit({ id: `station-checkin:${checkInKey}`, eventId: event.id, type: "STATION_CHECKED_IN", aggregateType: "StationVisit", aggregateId: visit.id, payload: { stationId: station.id, participationEntryId: entry.id, routeStepId: visit.routeStepId, state: visit.state, queuePosition: visit.queuePosition } });
    return { visit, station, team };
  }

  async callNext(input: { stationId: string; eventId: string; idempotencyKey: string; actorUserId: string }) {
    const station = await getPrisma().station.findUniqueOrThrow({ where: { id: input.stationId }, include: { event: true } });
    if (station.eventId !== input.eventId) throw new Error("Station belongs to another event");
    const result = await getPrisma().$transaction(async (tx) => {
      const replay = await tx.operationalReceipt.findUnique({ where: { eventId_idempotencyKey: { eventId: input.eventId, idempotencyKey: input.idempotencyKey } } });
      if (replay) return { visit: await tx.stationVisit.findUniqueOrThrow({ where: { id: replay.targetId } }), replayed: true };
      const reserved = await tx.stationVisit.count({ where: { stationId: station.id, state: { in: [...reservedStates] } } });
      if (station.capacity != null && reserved >= station.capacity) throw new Error("Station is at capacity");
      const next = await tx.stationVisit.findFirst({ where: { stationId: station.id, state: "QUEUED" }, orderBy: [{ queuePosition: "asc" }, { createdAt: "asc" }] });
      if (!next) throw new Error("No team is waiting in this station queue");
      const visit = await tx.stationVisit.update({ where: { id: next.id }, data: { state: "CALLED", calledAt: new Date(), queuePosition: null } });
      await normalizeQueue(tx, station.id);
      await tx.operationalReceipt.create({ data: { eventId: input.eventId, idempotencyKey: input.idempotencyKey, operationType: "STATION_CALL_NEXT", targetType: "StationVisit", targetId: visit.id, resultJson: asInputJson({ state: visit.state }) } });
      return { visit, replayed: false };
    });
    if (!result.replayed) await new AuditService().record({ organizationId: station.event.organizationId, eventId: input.eventId, actorUserId: input.actorUserId, action: "STATION_VISIT_CALLED", targetType: "StationVisit", targetId: result.visit.id });
    return result.visit;
  }

  async startVisit(input: { visitId: string; eventId: string; idempotencyKey: string; actorUserId: string }) {
    return this.transitionVisit(input, "STATION_VISIT_STARTED", async (tx, visit) => {
      if (visit.state === "ACTIVE") return visit;
      if (!["ARRIVED", "CALLED", "QUEUED"].includes(visit.state)) throw new Error(`Cannot start a visit in state ${visit.state}`);
      const station = await tx.station.findUniqueOrThrow({ where: { id: visit.stationId } });
      const active = await tx.stationVisit.count({ where: { stationId: visit.stationId, state: "ACTIVE" } });
      if (station.capacity != null && active >= station.capacity) throw new Error("Station is at active capacity");
      const updated = await tx.stationVisit.update({ where: { id: visit.id }, data: { state: "ACTIVE", startedAt: visit.startedAt ?? new Date(), queuePosition: null } });
      await normalizeQueue(tx, visit.stationId);
      return updated;
    });
  }

  async completeVisit(input: { visitId: string; eventId: string; idempotencyKey: string; actorUserId: string }) {
    const visit = await this.transitionVisit(input, "STATION_VISIT_COMPLETED", async (tx, current) => {
      if (current.state === "COMPLETED") return current;
      if (!["ARRIVED", "CALLED", "ACTIVE"].includes(current.state)) throw new Error(`Cannot complete a visit in state ${current.state}`);
      const updated = await tx.stationVisit.update({ where: { id: current.id }, data: { state: "COMPLETED", completedAt: new Date(), queuePosition: null } });
      const station = await tx.station.findUniqueOrThrow({ where: { id: current.stationId } });
      await promoteNextQueued(tx, station);
      return updated;
    });
    await new DomainEventService().emit({ id: `station-complete:${input.eventId}:${input.idempotencyKey}`, eventId: input.eventId, type: "STATION_VISIT_COMPLETED", aggregateType: "StationVisit", aggregateId: visit.id, payload: { stationId: visit.stationId, participationEntryId: visit.participationEntryId, routeStepId: visit.routeStepId } });
    return visit;
  }

  async skipVisit(input: { visitId: string; eventId: string; idempotencyKey: string; actorUserId: string; reason: string }) {
    const reason = input.reason.trim();
    if (!reason) throw new Error("Skip reason is required");
    return this.transitionVisit(input, "STATION_VISIT_SKIPPED", async (tx, current) => {
      if (current.state === "SKIPPED") return current;
      if (["COMPLETED", "CANCELLED", "REROUTED"].includes(current.state)) throw new Error(`Cannot skip a visit in state ${current.state}`);
      const updated = await tx.stationVisit.update({ where: { id: current.id }, data: { state: "SKIPPED", skippedAt: new Date(), queuePosition: null, metadataJson: asInputJson({ ...metadataObject(current.metadataJson), skipReason: reason }) } });
      const station = await tx.station.findUniqueOrThrow({ where: { id: current.stationId } });
      await normalizeQueue(tx, current.stationId);
      await promoteNextQueued(tx, station);
      return updated;
    }, reason);
  }

  async rerouteVisit(input: { visitId: string; targetStationId: string; eventId: string; idempotencyKey: string; actorUserId: string; reason: string }) {
    const reason = input.reason.trim();
    if (!reason) throw new Error("Reroute reason is required");
    const target = await getPrisma().station.findUniqueOrThrow({ where: { id: input.targetStationId } });
    if (target.eventId !== input.eventId) throw new Error("Fallback station belongs to another event");
    if (target.status !== "OPEN") throw new Error("Fallback station must be open");
    const source = await getPrisma().stationVisit.findUniqueOrThrow({ where: { id: input.visitId } });
    if (source.eventId !== input.eventId) throw new Error("Visit belongs to another event");
    const event = await getPrisma().event.findUniqueOrThrow({ where: { id: input.eventId } });
    const result = await getPrisma().$transaction(async (tx) => {
      const replay = await tx.operationalReceipt.findUnique({ where: { eventId_idempotencyKey: { eventId: input.eventId, idempotencyKey: input.idempotencyKey } } });
      if (replay) return { visit: await tx.stationVisit.findUniqueOrThrow({ where: { id: replay.targetId } }), replayed: true };
      const current = await tx.stationVisit.findUniqueOrThrow({ where: { id: input.visitId } });
      if (["COMPLETED", "SKIPPED", "CANCELLED"].includes(current.state)) throw new Error(`Cannot reroute a visit in state ${current.state}`);
      await tx.stationVisit.update({ where: { id: current.id }, data: { state: "REROUTED", reroutedAt: new Date(), queuePosition: null, metadataJson: asInputJson({ ...metadataObject(current.metadataJson), rerouteReason: reason, reroutedToStationId: target.id }) } });
      await normalizeQueue(tx, current.stationId);
      const existingTarget = await tx.stationVisit.findFirst({ where: { stationId: target.id, participationEntryId: current.participationEntryId, state: { in: [...nonTerminalStates] } }, orderBy: { createdAt: "desc" } });
      let created = existingTarget;
      if (!created) {
        const reserved = await tx.stationVisit.count({ where: { stationId: target.id, state: { in: [...reservedStates] } } });
        const state = nextCheckInState(target.capacity, reserved);
        const queuePosition = state === "QUEUED" ? ((await tx.stationVisit.aggregate({ where: { stationId: target.id, state: "QUEUED" }, _max: { queuePosition: true } }))._max.queuePosition ?? 0) + 1 : null;
        created = await tx.stationVisit.create({ data: { eventId: input.eventId, stationId: target.id, participationEntryId: current.participationEntryId, state, queuePosition, checkedInAt: new Date(), metadataJson: asInputJson({ fallbackFromVisitId: current.id, fallbackReason: reason }) } });
      }
      await tx.operationalReceipt.create({ data: { eventId: input.eventId, idempotencyKey: input.idempotencyKey, operationType: "STATION_VISIT_REROUTED", targetType: "StationVisit", targetId: created.id, resultJson: asInputJson({ sourceVisitId: current.id, targetStationId: target.id }) } });
      return { visit: created, replayed: false };
    });
    if (!result.replayed) await new AuditService().record({ organizationId: event.organizationId, eventId: event.id, actorUserId: input.actorUserId, action: "STATION_VISIT_REROUTED", targetType: "StationVisit", targetId: source.id, reason, after: { targetStationId: target.id, targetVisitId: result.visit.id } });
    return result.visit;
  }

  async rerouteStationTraffic(input: { fromStationId: string; toStationId: string; eventId: string; idempotencyKey: string; actorUserId: string; reason: string }) {
    const reason = input.reason.trim();
    if (!reason) throw new Error("Fallback reason is required");
    if (input.fromStationId === input.toStationId) throw new Error("Fallback station must be different");
    const [from, to, event] = await Promise.all([getPrisma().station.findUniqueOrThrow({ where: { id: input.fromStationId } }), getPrisma().station.findUniqueOrThrow({ where: { id: input.toStationId } }), getPrisma().event.findUniqueOrThrow({ where: { id: input.eventId } })]);
    if (from.eventId !== event.id || to.eventId !== event.id) throw new Error("Fallback stations must belong to this event");
    if (to.status !== "OPEN") throw new Error("Fallback station must be open");
    const result = await getPrisma().$transaction(async (tx) => {
      const replay = await tx.operationalReceipt.findUnique({ where: { eventId_idempotencyKey: { eventId: event.id, idempotencyKey: input.idempotencyKey } } });
      if (replay) return { moved: Number((replay.resultJson as any)?.moved ?? 0), replayed: true };
      const visits = await tx.stationVisit.findMany({ where: { stationId: from.id, state: { in: [...nonTerminalStates] } }, orderBy: { createdAt: "asc" } });
      let reserved = await tx.stationVisit.count({ where: { stationId: to.id, state: { in: [...reservedStates] } } });
      let queueMax = (await tx.stationVisit.aggregate({ where: { stationId: to.id, state: "QUEUED" }, _max: { queuePosition: true } }))._max.queuePosition ?? 0;
      for (const visit of visits) {
        await tx.stationVisit.update({ where: { id: visit.id }, data: { state: "REROUTED", reroutedAt: new Date(), queuePosition: null, metadataJson: asInputJson({ ...metadataObject(visit.metadataJson), rerouteReason: reason, reroutedToStationId: to.id }) } });
        const existing = await tx.stationVisit.findFirst({ where: { stationId: to.id, participationEntryId: visit.participationEntryId, state: { in: [...nonTerminalStates] } } });
        if (!existing) {
          const state = nextCheckInState(to.capacity, reserved);
          let queuePosition: number | null = null;
          if (state === "ARRIVED") reserved += 1;
          else { queueMax += 1; queuePosition = queueMax; }
          await tx.stationVisit.create({ data: { eventId: event.id, stationId: to.id, participationEntryId: visit.participationEntryId, state, queuePosition, checkedInAt: new Date(), metadataJson: asInputJson({ fallbackFromVisitId: visit.id, fallbackReason: reason }) } });
        }
      }
      await normalizeQueue(tx, from.id);
      await tx.operationalReceipt.create({ data: { eventId: event.id, idempotencyKey: input.idempotencyKey, operationType: "STATION_TRAFFIC_REROUTED", targetType: "Station", targetId: from.id, resultJson: asInputJson({ moved: visits.length, toStationId: to.id }) } });
      return { moved: visits.length, replayed: false };
    });
    if (!result.replayed) await new AuditService().record({ organizationId: event.organizationId, eventId: event.id, actorUserId: input.actorUserId, action: "STATION_TRAFFIC_REROUTED", targetType: "Station", targetId: from.id, reason, after: { toStationId: to.id, moved: result.moved } });
    return result;
  }

  private async transitionVisit(input: { visitId: string; eventId: string; idempotencyKey: string; actorUserId: string }, action: string, mutate: (tx: any, visit: any) => Promise<any>, reason?: string) {
    const event = await getPrisma().event.findUniqueOrThrow({ where: { id: input.eventId } });
    const result = await getPrisma().$transaction(async (tx) => {
      const replay = await tx.operationalReceipt.findUnique({ where: { eventId_idempotencyKey: { eventId: input.eventId, idempotencyKey: input.idempotencyKey } } });
      if (replay) return { visit: await tx.stationVisit.findUniqueOrThrow({ where: { id: replay.targetId } }), replayed: true };
      const visit = await tx.stationVisit.findUniqueOrThrow({ where: { id: input.visitId } });
      if (visit.eventId !== input.eventId) throw new Error("Visit belongs to another event");
      const beforeState = visit.state;
      const updated = await mutate(tx, visit);
      await tx.operationalReceipt.create({ data: { eventId: input.eventId, idempotencyKey: input.idempotencyKey, operationType: action, targetType: "StationVisit", targetId: updated.id, resultJson: asInputJson({ beforeState, afterState: updated.state }) } });
      return { visit: updated, replayed: false, beforeState };
    });
    if (!result.replayed) await new AuditService().record({ organizationId: event.organizationId, eventId: event.id, actorUserId: input.actorUserId, action, targetType: "StationVisit", targetId: result.visit.id, reason, before: { state: result.beforeState }, after: { state: result.visit.state } });
    return result.visit;
  }
}
