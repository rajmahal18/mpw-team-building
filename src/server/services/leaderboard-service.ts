import { createHash } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import { asInputJson } from "@/lib/json";
import { buildLiveStandings } from "@/engine/scoring/aggregate-ledger";
import { LeaderboardDefinitionSchema, LeaderboardSourceSchema, LeaderboardTieBreakerSchema, type LeaderboardDefinition } from "@/schemas/results";
import { AuditService } from "./audit-service";
import { DomainEventService } from "./domain-event-service";

function hash(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }

export class LeaderboardService {
  async create(input: { eventId: string; machineKey: string; name: string; config: LeaderboardDefinition; actorUserId: string }) {
    const event = await getPrisma().event.findUniqueOrThrow({ where: { id: input.eventId } });
    const config = LeaderboardDefinitionSchema.parse(input.config);
    const leaderboard = await getPrisma().leaderboardDefinition.create({ data: { eventId: input.eventId, machineKey: input.machineKey, name: input.name, configJson: asInputJson(config) } });
    await new AuditService().record({ organizationId: event.organizationId, eventId: event.id, actorUserId: input.actorUserId, action: "LEADERBOARD_CREATED", targetType: "LeaderboardDefinition", targetId: leaderboard.id, after: config });
    return leaderboard;
  }

  async addSource(input: { leaderboardId: string; source: unknown; actorUserId: string }) {
    const leaderboard = await getPrisma().leaderboardDefinition.findUniqueOrThrow({ where: { id: input.leaderboardId }, include: { event: true } });
    const current = LeaderboardDefinitionSchema.parse(leaderboard.configJson);
    const source = LeaderboardSourceSchema.parse(input.source);
    if (current.sources.some((item) => item.id === source.id)) throw new Error("Leaderboard source key already exists");
    const next = LeaderboardDefinitionSchema.parse({ ...current, sources: [...current.sources, source] });
    const updated = await getPrisma().leaderboardDefinition.update({ where: { id: leaderboard.id }, data: { configJson: asInputJson(next) } });
    await new AuditService().record({ organizationId: leaderboard.event.organizationId, eventId: leaderboard.eventId, actorUserId: input.actorUserId, action: "LEADERBOARD_SOURCE_ADDED", targetType: "LeaderboardDefinition", targetId: leaderboard.id, before: current, after: next });
    return updated;
  }

  async addTieBreaker(input: { leaderboardId: string; tieBreaker: unknown; actorUserId: string }) {
    const leaderboard = await getPrisma().leaderboardDefinition.findUniqueOrThrow({ where: { id: input.leaderboardId }, include: { event: true } });
    const current = LeaderboardDefinitionSchema.parse(leaderboard.configJson);
    const tieBreaker = LeaderboardTieBreakerSchema.parse(input.tieBreaker);
    const next = LeaderboardDefinitionSchema.parse({ ...current, tieBreakers: [...current.tieBreakers, tieBreaker] });
    const updated = await getPrisma().leaderboardDefinition.update({ where: { id: leaderboard.id }, data: { configJson: asInputJson(next) } });
    await new AuditService().record({ organizationId: leaderboard.event.organizationId, eventId: leaderboard.eventId, actorUserId: input.actorUserId, action: "LEADERBOARD_TIEBREAKER_ADDED", targetType: "LeaderboardDefinition", targetId: leaderboard.id, before: current, after: next });
    return updated;
  }

  async live(leaderboardId: string) {
    const leaderboard = await getPrisma().leaderboardDefinition.findUniqueOrThrow({ where: { id: leaderboardId } });
    const definition = LeaderboardDefinitionSchema.parse(leaderboard.configJson);
    const entries = await getPrisma().participationEntry.findMany({ where: { eventId: leaderboard.eventId }, include: { team: true }, orderBy: { createdAt: "asc" } });
    const ids = entries.map((entry) => entry.id);
    const [ledger, runs] = await Promise.all([
      getPrisma().scoreEntry.findMany({ where: { eventId: leaderboard.eventId, participationEntryId: { in: ids } }, orderBy: { createdAt: "asc" } }),
      getPrisma().activityRun.findMany({ where: { eventId: leaderboard.eventId, participationEntryId: { in: ids } }, select: { id: true, participationEntryId: true, activityInstanceId: true, attemptNo: true, completedAt: true, createdAt: true } }),
    ]);
    return buildLiveStandings({
      definition,
      entries: entries.map((entry) => ({ id: entry.id, label: entry.team?.name || entry.label || entry.id.slice(0, 8), kind: entry.kind })),
      ledger: ledger.map((row) => ({ participationEntryId: row.participationEntryId, activityInstanceId: row.activityInstanceId, activityRunId: row.activityRunId, dimensionKey: row.dimensionKey, amount: Number(row.amount.toString()), entryType: row.entryType, createdAt: row.createdAt })),
      runs,
    });
  }

  async snapshot(input: { leaderboardId: string; state: "PROVISIONAL" | "FINAL"; actorUserId: string; reason?: string }) {
    const leaderboard = await getPrisma().leaderboardDefinition.findUniqueOrThrow({ where: { id: input.leaderboardId }, include: { event: true } });
    const standings = await this.live(leaderboard.id);
    const inputHash = hash({ config: leaderboard.configJson, standings });
    const latest = await getPrisma().leaderboardSnapshot.aggregate({ where: { leaderboardDefinitionId: leaderboard.id }, _max: { revision: true } });
    const snapshot = await getPrisma().leaderboardSnapshot.create({ data: { leaderboardDefinitionId: leaderboard.id, revision: (latest._max.revision ?? 0) + 1, state: input.state, standingsJson: asInputJson(standings), inputHash, reason: input.reason, createdById: input.actorUserId } });
    await new AuditService().record({ organizationId: leaderboard.event.organizationId, eventId: leaderboard.eventId, actorUserId: input.actorUserId, action: input.state === "FINAL" ? "LEADERBOARD_FINALIZED" : "LEADERBOARD_SNAPSHOTTED", targetType: "LeaderboardSnapshot", targetId: snapshot.id, after: { revision: snapshot.revision, state: snapshot.state, inputHash }, reason: input.reason });
    await new DomainEventService().emit({ eventId: leaderboard.eventId, type: input.state === "FINAL" ? "LEADERBOARD_FINALIZED" : "LEADERBOARD_PROVISIONAL_SNAPSHOT", aggregateType: "LeaderboardDefinition", aggregateId: leaderboard.id, payload: { snapshotId: snapshot.id, revision: snapshot.revision, state: snapshot.state } });
    return snapshot;
  }
}
