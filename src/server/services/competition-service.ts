import { createRoundRobinMatches } from "@/engine/competitions/round-robin";
import { createNextEliminationRound, createSingleEliminationFirstRound } from "@/engine/competitions/single-elimination";
import { buildRoundRobinStandings } from "@/engine/competitions/round-robin-standings";
import { getPrisma } from "@/lib/prisma";
import { asInputJson } from "@/lib/json";
import { MatchResultSchema, RoundRobinConfigSchema, SingleEliminationConfigSchema } from "@/schemas/results";
import { AuditService } from "./audit-service";
import { DomainEventService } from "./domain-event-service";

async function validateEntries(eventId: string, entryIds: string[]) {
  if (entryIds.length < 2) throw new Error("Competition needs at least two entries");
  const uniqueIds = [...new Set(entryIds)];
  const entries = await getPrisma().participationEntry.findMany({ where: { id: { in: uniqueIds } } });
  if (entries.length !== uniqueIds.length || entries.some((entry) => entry.eventId !== eventId)) throw new Error("Competition contains invalid or cross-event entries");
  return uniqueIds;
}

async function validateActivity(eventId: string, activityInstanceId?: string) {
  if (!activityInstanceId) return;
  const activity = await getPrisma().activityInstance.findUniqueOrThrow({ where: { id: activityInstanceId } });
  if (activity.eventId !== eventId) throw new Error("Competition activity belongs to another event");
}

export class CompetitionService {
  async createRoundRobin(input: { eventId: string; activityInstanceId?: string; machineKey: string; name: string; entryIds: string[]; config?: unknown; actorUserId?: string }) {
    const entryIds = await validateEntries(input.eventId, input.entryIds);
    await validateActivity(input.eventId, input.activityInstanceId);
    const config = RoundRobinConfigSchema.parse(input.config ?? {});
    const drafts = createRoundRobinMatches(entryIds.map((id) => ({ id })));
    const competition = await getPrisma().$transaction(async (tx) => {
      const created = await tx.competition.create({ data: { eventId: input.eventId, activityInstanceId: input.activityInstanceId, machineKey: input.machineKey, name: input.name, formatKey: "round_robin", configJson: asInputJson(config), state: "SEEDED" } });
      for (const draft of drafts) {
        const match = await tx.match.create({ data: { competitionId: created.id, roundKey: String(draft.round), sequence: drafts.filter((item)=>item.round===draft.round).findIndex((item)=>item===draft)+1, state: "SCHEDULED" } });
        await tx.matchSide.createMany({ data: [
          { matchId: match.id, participationEntryId: draft.homeEntryId, sideKey: "home" },
          { matchId: match.id, participationEntryId: draft.awayEntryId, sideKey: "away" },
        ] });
      }
      return tx.competition.findUniqueOrThrow({ where: { id: created.id }, include: { matches: { include: { sides: true } } } });
    });
    await this.auditCreation(competition.id, input.actorUserId);
    return competition;
  }

  async createSingleElimination(input: { eventId: string; activityInstanceId?: string; machineKey: string; name: string; entryIds: string[]; config?: unknown; actorUserId?: string }) {
    const entryIds = await validateEntries(input.eventId, input.entryIds);
    await validateActivity(input.eventId, input.activityInstanceId);
    const config = SingleEliminationConfigSchema.parse(input.config ?? {});
    const drafts = createSingleEliminationFirstRound(entryIds.map((id, index) => ({ id, seed: index + 1 })));
    const competition = await getPrisma().$transaction(async (tx) => {
      const created = await tx.competition.create({ data: { eventId: input.eventId, activityInstanceId: input.activityInstanceId, machineKey: input.machineKey, name: input.name, formatKey: "single_elimination", configJson: asInputJson(config), state: "SEEDED" } });
      for (const draft of drafts) {
        const byeWinner = draft.state === "BYE" ? draft.entryIds[0] : undefined;
        const match = await tx.match.create({ data: { competitionId: created.id, roundKey: String(draft.round), sequence: draft.sequence, state: draft.state, resultJson: byeWinner ? asInputJson({ winnerEntryId: byeWinner, sideScores: [], note: "Automatic bye" }) : undefined, finalizedAt: byeWinner ? new Date() : undefined } });
        for (const [index, entryId] of draft.entryIds.entries()) await tx.matchSide.create({ data: { matchId: match.id, participationEntryId: entryId, sideKey: index === 0 ? "home" : "away", seed: entryIds.indexOf(entryId)+1, isWinner: byeWinner === entryId ? true : undefined } });
      }
      return tx.competition.findUniqueOrThrow({ where: { id: created.id }, include: { matches: { include: { sides: true } } } });
    });
    await this.auditCreation(competition.id, input.actorUserId);
    await this.advanceSingleElimination(competition.id);
    return competition;
  }

  async recordMatchResult(input: { matchId: string; result: unknown; actorUserId: string; idempotencyKey: string }) {
    const match = await getPrisma().match.findUniqueOrThrow({ where: { id: input.matchId }, include: { competition: { include: { event: true } }, sides: true } });
    const parsed = MatchResultSchema.parse(input.result);
    const sideIds = match.sides.map((side)=>side.participationEntryId);
    if (parsed.winnerEntryId && !sideIds.includes(parsed.winnerEntryId)) throw new Error("Winner is not a side in this match");
    for (const side of parsed.sideScores) if (!sideIds.includes(side.entryId)) throw new Error("Result contains an entry outside this match");
    if (match.competition.formatKey === "single_elimination" && !parsed.winnerEntryId) throw new Error("Single elimination requires a winner");
    if (match.competition.formatKey === "single_elimination" && match.state === "FINAL") {
      const otherRounds = await getPrisma().match.findMany({ where: { competitionId: match.competition.id }, select: { roundKey: true } });
      if (otherRounds.some((candidate) => Number(candidate.roundKey) > Number(match.roundKey))) throw new Error("Cannot correct an elimination result after downstream matches exist; resolve the bracket through an audited reset/void workflow instead");
    }
    if (match.competition.formatKey === "round_robin") {
      const config = RoundRobinConfigSchema.parse(match.competition.configJson ?? {});
      if (!parsed.winnerEntryId && !config.allowDraws) throw new Error("This round robin does not allow draws");
    }
    const replay = await getPrisma().operationalReceipt.findUnique({ where: { eventId_idempotencyKey: { eventId: match.competition.eventId, idempotencyKey: input.idempotencyKey } } });
    if (replay) return match;

    const updated = await getPrisma().$transaction(async (tx) => {
      const current = await tx.match.findUniqueOrThrow({ where: { id: match.id }, include: { sides: true } });
      await tx.matchSide.updateMany({ where: { matchId: current.id }, data: { isWinner: false } });
      for (const side of current.sides) {
        const sideResult = parsed.sideScores.find((item)=>item.entryId===side.participationEntryId);
        await tx.matchSide.update({ where: { id: side.id }, data: { isWinner: parsed.winnerEntryId ? parsed.winnerEntryId === side.participationEntryId : false, resultJson: asInputJson(sideResult ?? {}) } });
      }
      const result = await tx.match.update({ where: { id: current.id }, data: { resultJson: asInputJson(parsed), state: "FINAL", finalizedAt: new Date() }, include: { sides: true } });
      await tx.operationalReceipt.create({ data: { eventId: match.competition.eventId, idempotencyKey: input.idempotencyKey, operationType: "MATCH_RESULT_FINALIZED", targetType: "Match", targetId: match.id, resultJson: asInputJson(parsed) } });
      return result;
    });
    await new AuditService().record({ organizationId: match.competition.event.organizationId, eventId: match.competition.eventId, actorUserId: input.actorUserId, action: "MATCH_RESULT_FINALIZED", targetType: "Match", targetId: match.id, before: match.resultJson, after: parsed });
    await new DomainEventService().emit({ id: `match-result:${input.idempotencyKey}`, eventId: match.competition.eventId, type: "MATCH_RESULT_FINALIZED", aggregateType: "Match", aggregateId: match.id, payload: parsed });
    if (match.competition.formatKey === "single_elimination") await this.advanceSingleElimination(match.competition.id);
    else await this.updateRoundRobinCompletion(match.competition.id);
    return updated;
  }

  async roundRobinStandings(competitionId: string) {
    const competition = await getPrisma().competition.findUniqueOrThrow({ where: { id: competitionId }, include: { matches: { include: { sides: true } } } });
    if (competition.formatKey !== "round_robin") throw new Error("Competition is not round robin");
    const config = RoundRobinConfigSchema.parse(competition.configJson ?? {});
    const entryIds: string[] = [...new Set<string>(
      competition.matches.flatMap((match) => match.sides.map((side) => String(side.participationEntryId))),
    )];
    const resolved = competition.matches.filter((match)=>match.state === "FINAL").map((match)=>({ sideEntryIds: match.sides.map((side)=>side.participationEntryId), result: MatchResultSchema.parse(match.resultJson) }));
    return buildRoundRobinStandings(entryIds, resolved, config);
  }

  async finalizeCompetition(input: { competitionId: string; actorUserId: string; reason?: string }) {
    const competition = await getPrisma().competition.findUniqueOrThrow({ where: { id: input.competitionId }, include: { event: true, matches: true } });
    const unresolved = competition.matches.filter((match)=>!["FINAL","BYE","WALKOVER","VOID","CANCELLED"].includes(match.state));
    if (unresolved.length) throw new Error("Competition still has unresolved matches");
    const updated = await getPrisma().competition.update({ where: { id: competition.id }, data: { state: "FINALIZED" } });
    await new AuditService().record({ organizationId: competition.event.organizationId, eventId: competition.eventId, actorUserId: input.actorUserId, action: "COMPETITION_FINALIZED", targetType: "Competition", targetId: competition.id, after: { state: "FINALIZED" }, reason: input.reason });
    await new DomainEventService().emit({ eventId: competition.eventId, type: "COMPETITION_FINALIZED", aggregateType: "Competition", aggregateId: competition.id, payload: { formatKey: competition.formatKey } });
    return updated;
  }

  private async auditCreation(competitionId: string, actorUserId?: string) {
    const competition = await getPrisma().competition.findUniqueOrThrow({ where: { id: competitionId }, include: { event: true } });
    if (actorUserId) await new AuditService().record({ organizationId: competition.event.organizationId, eventId: competition.eventId, actorUserId, action: "COMPETITION_CREATED", targetType: "Competition", targetId: competition.id, after: { formatKey: competition.formatKey, name: competition.name } });
    await new DomainEventService().emit({ eventId: competition.eventId, type: "COMPETITION_CREATED", aggregateType: "Competition", aggregateId: competition.id, payload: { formatKey: competition.formatKey } });
  }

  private async updateRoundRobinCompletion(competitionId: string) {
    const competition = await getPrisma().competition.findUniqueOrThrow({ where: { id: competitionId }, include: { matches: true } });
    if (competition.matches.length && competition.matches.every((match)=>match.state === "FINAL")) await getPrisma().competition.update({ where: { id: competition.id }, data: { state: "COMPLETE" } });
    else if (competition.state === "SEEDED") await getPrisma().competition.update({ where: { id: competition.id }, data: { state: "LIVE" } });
  }

  private async advanceSingleElimination(competitionId: string) {
    const competition = await getPrisma().competition.findUniqueOrThrow({ where: { id: competitionId }, include: { matches: { include: { sides: true } } } });
    if (competition.formatKey !== "single_elimination" || competition.state === "FINALIZED") return;
    const rounds = competition.matches.map((match)=>Number(match.roundKey)).filter(Number.isFinite);
    const currentRound = Math.max(...rounds, 1);
    const roundMatches = competition.matches.filter((match)=>Number(match.roundKey)===currentRound);
    if (!roundMatches.length || !roundMatches.every((match)=>["FINAL","BYE","WALKOVER"].includes(match.state))) {
      if (competition.state === "SEEDED") await getPrisma().competition.update({ where: { id: competition.id }, data: { state: "LIVE" } });
      return;
    }
    const winners = roundMatches.map((match)=>{
      if (match.state === "BYE") return match.sides[0]?.participationEntryId;
      const parsed = MatchResultSchema.parse(match.resultJson);
      return parsed.winnerEntryId ?? undefined;
    }).filter((id): id is string=>Boolean(id));
    if (winners.length === 1) {
      await getPrisma().competition.update({ where: { id: competition.id }, data: { state: "COMPLETE" } });
      return;
    }
    const nextRound = currentRound + 1;
    if (competition.matches.some((match)=>Number(match.roundKey)===nextRound)) return;
    const drafts = createNextEliminationRound(winners, nextRound);
    await getPrisma().$transaction(async (tx)=>{
      for (const draft of drafts) {
        const byeWinner = draft.state === "BYE" ? draft.entryIds[0] : undefined;
        const match = await tx.match.create({ data: { competitionId: competition.id, roundKey: String(nextRound), sequence: draft.sequence, state: draft.state, resultJson: byeWinner ? asInputJson({ winnerEntryId: byeWinner, sideScores: [], note: "Automatic bye" }) : undefined, finalizedAt: byeWinner ? new Date() : undefined } });
        for (const [index, entryId] of draft.entryIds.entries()) await tx.matchSide.create({ data: { matchId: match.id, participationEntryId: entryId, sideKey: index===0?"home":"away", isWinner: byeWinner === entryId ? true : undefined } });
      }
      await tx.competition.update({ where: { id: competition.id }, data: { state: "LIVE" } });
    });
    if (drafts.every((draft)=>draft.state === "BYE")) await this.advanceSingleElimination(competition.id);
  }
}
