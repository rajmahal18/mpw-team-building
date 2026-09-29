import { getPrisma } from "@/lib/prisma";
import { AuditService } from "./audit-service";
import { DomainEventService } from "./domain-event-service";

export class ScoreLedgerService {
  async addAdjustment(input: {
    eventId: string;
    participationEntryId: string;
    dimensionKey: string;
    amount: number;
    entryType: "BONUS" | "PENALTY" | "MANUAL" | "OVERRIDE_DELTA";
    reason: string;
    actorUserId: string;
    activityInstanceId?: string;
    activityRunId?: string;
    idempotencyKey: string;
  }) {
    if (!Number.isFinite(input.amount)) throw new Error("Score adjustment must be finite");
    if (!input.reason.trim()) throw new Error("Score adjustment reason is required");
    const event = await getPrisma().event.findUniqueOrThrow({ where: { id: input.eventId } });
    const entry = await getPrisma().participationEntry.findUniqueOrThrow({ where: { id: input.participationEntryId } });
    if (entry.eventId !== input.eventId) throw new Error("Participation entry belongs to another event");
    if (input.activityInstanceId) {
      const activity = await getPrisma().activityInstance.findUniqueOrThrow({ where: { id: input.activityInstanceId } });
      if (activity.eventId !== input.eventId) throw new Error("Activity belongs to another event");
    }
    if (input.activityRunId) {
      const run = await getPrisma().activityRun.findUniqueOrThrow({ where: { id: input.activityRunId } });
      if (run.eventId !== input.eventId || run.participationEntryId !== entry.id) throw new Error("Activity run is outside the adjustment scope");
    }
    const existing = await getPrisma().scoreEntry.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) return existing;
    const amount = input.entryType === "PENALTY" ? -Math.abs(input.amount) : input.entryType === "BONUS" ? Math.abs(input.amount) : input.amount;
    const score = await getPrisma().scoreEntry.create({
      data: {
        eventId: input.eventId,
        participationEntryId: input.participationEntryId,
        activityInstanceId: input.activityInstanceId,
        activityRunId: input.activityRunId,
        dimensionKey: input.dimensionKey,
        amount,
        entryType: input.entryType,
        reason: input.reason,
        actorUserId: input.actorUserId,
        idempotencyKey: input.idempotencyKey,
        provenanceJson: { source: "MANUAL_LEDGER_ADJUSTMENT" },
      },
    });
    await new AuditService().record({ organizationId: event.organizationId, eventId: event.id, actorUserId: input.actorUserId, action: "SCORE_ADJUSTMENT_ADDED", targetType: "ScoreEntry", targetId: score.id, after: { entryType: score.entryType, amount, dimensionKey: input.dimensionKey, participationEntryId: input.participationEntryId }, reason: input.reason });
    await new DomainEventService().emit({ id: `score-adjust:${input.idempotencyKey}`, eventId: event.id, type: "SCORE_ADJUSTMENT_ADDED", aggregateType: "ParticipationEntry", aggregateId: input.participationEntryId, payload: { scoreEntryId: score.id, entryType: score.entryType, amount, dimensionKey: input.dimensionKey } });
    return score;
  }

  async reverse(input: { scoreEntryId: string; actorUserId: string; reason: string }) {
    if (!input.reason.trim()) throw new Error("Reversal reason is required");
    const original = await getPrisma().scoreEntry.findUniqueOrThrow({ where: { id: input.scoreEntryId }, include: { event: true } });
    if (original.entryType === "REVERSAL") throw new Error("A reversal row cannot be reversed directly");
    const existing = await getPrisma().scoreEntry.findFirst({ where: { reversalOfId: original.id, entryType: "REVERSAL" } });
    if (existing) return existing;
    const reversal = await getPrisma().scoreEntry.create({
      data: {
        eventId: original.eventId,
        participationEntryId: original.participationEntryId,
        activityInstanceId: original.activityInstanceId,
        activityRunId: original.activityRunId,
        dimensionKey: original.dimensionKey,
        amount: -Number(original.amount.toString()),
        entryType: "REVERSAL",
        reason: input.reason,
        actorUserId: input.actorUserId,
        reversalOfId: original.id,
        idempotencyKey: `reverse:${original.id}`,
        provenanceJson: { source: "LEDGER_REVERSAL" },
      },
    });
    await new AuditService().record({ organizationId: original.event.organizationId, eventId: original.eventId, actorUserId: input.actorUserId, action: "SCORE_ENTRY_REVERSED", targetType: "ScoreEntry", targetId: original.id, before: { amount: Number(original.amount.toString()), entryType: original.entryType }, after: { reversalId: reversal.id }, reason: input.reason });
    await new DomainEventService().emit({ id: `score-reverse:${original.id}`, eventId: original.eventId, type: "SCORE_ENTRY_REVERSED", aggregateType: "ScoreEntry", aggregateId: original.id, payload: { reversalId: reversal.id } });
    return reversal;
  }
}
