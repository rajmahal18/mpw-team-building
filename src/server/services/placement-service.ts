import { createHash } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import { asInputJson } from "@/lib/json";
import { rankNumericValues } from "@/engine/scoring/rank-values";
import { pointsForRank } from "@/engine/scoring/placement-points";
import { PlacementDefinitionSchema, type PlacementDefinition } from "@/schemas/results";
import { AuditService } from "./audit-service";
import { DomainEventService } from "./domain-event-service";

function hash(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 24); }

function aggregateAttempts(values: Array<{ value: number; attemptNo: number; createdAt: Date }>, mode: PlacementDefinition["attemptMode"], direction: PlacementDefinition["direction"]) {
  if (!values.length) return undefined;
  if (mode === "SUM") return values.reduce((sum, item) => sum + item.value, 0);
  if (mode === "AVERAGE") return values.reduce((sum, item) => sum + item.value, 0) / values.length;
  if (mode === "BEST") return direction === "DESC" ? Math.max(...values.map((item) => item.value)) : Math.min(...values.map((item) => item.value));
  return [...values].sort((a,b)=>b.attemptNo-a.attemptNo || b.createdAt.getTime()-a.createdAt.getTime())[0].value;
}

export class PlacementService {
  async apply(input: { eventId: string; activityInstanceId: string; definition: PlacementDefinition; actorUserId: string; idempotencyKey: string }) {
    const definition = PlacementDefinitionSchema.parse(input.definition);
    const [event, activity] = await Promise.all([
      getPrisma().event.findUniqueOrThrow({ where: { id: input.eventId } }),
      getPrisma().activityInstance.findUniqueOrThrow({ where: { id: input.activityInstanceId } }),
    ]);
    if (activity.eventId !== event.id) throw new Error("Activity belongs to another event");
    const replay = await getPrisma().operationalReceipt.findUnique({ where: { eventId_idempotencyKey: { eventId: event.id, idempotencyKey: input.idempotencyKey } } });
    if (replay) return replay;

    type PlacementRunRow = { id: string; participationEntryId: string; attemptNo: number; createdAt: Date };
    const runs = await getPrisma().activityRun.findMany({
      where: { eventId: event.id, activityInstanceId: activity.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, participationEntryId: true, attemptNo: true, createdAt: true },
    }) as PlacementRunRow[];
    const runMap = new Map<string, PlacementRunRow>(runs.map((run) => [run.id, run]));
    const perEntry = new Map<string, Array<{value:number;attemptNo:number;createdAt:Date}>>();

    if (definition.sourceType === "SCORE") {
      const rows = await getPrisma().scoreEntry.findMany({ where: { eventId: event.id, activityInstanceId: activity.id, dimensionKey: definition.sourceKey } });
      const perRun = new Map<string, number>();
      for (const row of rows) if (row.activityRunId) perRun.set(row.activityRunId, (perRun.get(row.activityRunId) ?? 0) + Number(row.amount.toString()));
      for (const [runId, value] of perRun) {
        const run = runMap.get(runId); if (!run) continue;
        const list = perEntry.get(run.participationEntryId) ?? []; list.push({ value, attemptNo: run.attemptNo, createdAt: run.createdAt }); perEntry.set(run.participationEntryId, list);
      }
    } else {
      const observations = await getPrisma().metricObservation.findMany({ where: { activityRunId: { in: runs.map((run)=>run.id) }, metricKey: definition.sourceKey }, orderBy: { recordedAt: "asc" } });
      const latest = new Map<string, number>();
      for (const observation of observations) if (typeof observation.valueJson === "number" && Number.isFinite(observation.valueJson)) latest.set(observation.activityRunId, observation.valueJson);
      for (const [runId, value] of latest) {
        const run = runMap.get(runId); if (!run) continue;
        const list = perEntry.get(run.participationEntryId) ?? []; list.push({ value, attemptNo: run.attemptNo, createdAt: run.createdAt }); perEntry.set(run.participationEntryId, list);
      }
    }

    const values = [...perEntry.entries()].flatMap(([entryId, attempts]) => {
      const value = aggregateAttempts(attempts, definition.attemptMode, definition.direction);
      return value === undefined ? [] : [{ entryId, value }];
    });
    const ranked = rankNumericValues(values, { direction: definition.direction, tieTolerance: definition.tieTolerance, style: "COMPETITION" });
    const generationHash = hash({ activityInstanceId: activity.id, definition, values });

    const result = await getPrisma().$transaction(async (tx) => {
      const oldPlacements = await tx.scoreEntry.findMany({ where: { eventId: event.id, activityInstanceId: activity.id, dimensionKey: definition.outputDimensionKey, entryType: "PLACEMENT" } });
      const reversals = oldPlacements.length ? await tx.scoreEntry.findMany({ where: { reversalOfId: { in: oldPlacements.map((row)=>row.id) }, entryType: "REVERSAL" } }) : [];
      const reversed = new Set(reversals.map((row)=>row.reversalOfId).filter(Boolean));
      const active = oldPlacements.filter((row)=>!reversed.has(row.id));
      for (const old of active) await tx.scoreEntry.create({ data: { eventId: old.eventId, participationEntryId: old.participationEntryId, activityInstanceId: old.activityInstanceId, activityRunId: old.activityRunId, dimensionKey: old.dimensionKey, amount: -Number(old.amount.toString()), entryType: "REVERSAL", reversalOfId: old.id, reason: "Placement recomputed", actorUserId: input.actorUserId, idempotencyKey: `placement-reverse:${old.id}:${generationHash}`, provenanceJson: asInputJson({ source: "PLACEMENT_RECOMPUTE", generationHash }) } });
      const created = [];
      for (const item of ranked) {
        const points = pointsForRank(item.rank, definition.rules);
        created.push(await tx.scoreEntry.create({ data: { eventId: event.id, participationEntryId: item.entryId, activityInstanceId: activity.id, dimensionKey: definition.outputDimensionKey, amount: points, entryType: "PLACEMENT", reason: `Placement rank ${item.rank}`, actorUserId: input.actorUserId, idempotencyKey: `placement:${input.idempotencyKey}:${item.entryId}`, provenanceJson: asInputJson({ source: "PLACEMENT_POINTS", sourceType: definition.sourceType, sourceKey: definition.sourceKey, sourceValue: item.value, rank: item.rank, generationHash, definition }) } }));
      }
      const receipt = await tx.operationalReceipt.create({ data: { eventId: event.id, idempotencyKey: input.idempotencyKey, operationType: "PLACEMENT_POINTS_APPLIED", targetType: "ActivityInstance", targetId: activity.id, resultJson: asInputJson({ generationHash, ranked: ranked.map((item)=>({ entryId:item.entryId, value:item.value, rank:item.rank, points:pointsForRank(item.rank,definition.rules) })) }) } });
      return { receipt, created };
    });
    await new AuditService().record({ organizationId: event.organizationId, eventId: event.id, actorUserId: input.actorUserId, action: "PLACEMENT_POINTS_APPLIED", targetType: "ActivityInstance", targetId: activity.id, after: { definition, generationHash, count: result.created.length } });
    await new DomainEventService().emit({ id: `placement:${input.idempotencyKey}`, eventId: event.id, type: "PLACEMENT_POINTS_APPLIED", aggregateType: "ActivityInstance", aggregateId: activity.id, payload: { generationHash, count: result.created.length, outputDimensionKey: definition.outputDimensionKey } });
    return result.receipt;
  }
}
