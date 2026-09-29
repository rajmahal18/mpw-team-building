"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { requireEventCapability } from "@/server/permissions/capabilities";
import { MachineKeySchema } from "@/schemas/shared";
import { makeMachineKey } from "@/lib/machine-key";
import { PlacementPointRuleSchema } from "@/schemas/results";
import { ActivityRunService } from "@/server/services/activity-run-service";
import { LeaderboardService } from "@/server/services/leaderboard-service";
import { PlacementService } from "@/server/services/placement-service";
import { ScoreLedgerService } from "@/server/services/score-ledger-service";

const text=(form:FormData,key:string)=>String(form.get(key)??"").trim();
async function userOrLogin(){const user=await getCurrentUser();if(!user)redirect("/login");return user;}

export async function syncTeamEntries(formData: FormData) {
  const user=await userOrLogin(); const eventId=text(formData,"eventId"); await requireEventCapability(user.id,eventId,"scores.adjust");
  await new ActivityRunService().ensureActiveTeamEntries(eventId); revalidatePath(`/admin/events/${eventId}/scores`);
}

export async function createLeaderboard(formData: FormData) {
  const user=await userOrLogin(); const eventId=text(formData,"eventId"); await requireEventCapability(user.id,eventId,"scores.adjust");
  await new ActivityRunService().ensureActiveTeamEntries(eventId);
  const selectionMode=text(formData,"selectionMode") as "ALL"|"BEST_N"|"DROP_LOWEST_N";
  const count=Number(text(formData,"selectionCount")||0);
  const selection=selectionMode==="ALL"?{mode:"ALL" as const}:selectionMode==="BEST_N"?{mode:"BEST_N" as const,count:Math.max(1,count)}:{mode:"DROP_LOWEST_N" as const,count:Math.max(0,count)};
  await new LeaderboardService().create({ eventId, machineKey:text(formData,"machineKey") ? MachineKeySchema.parse(text(formData,"machineKey")) : makeMachineKey(text(formData,"name"),"leaderboard"), name:text(formData,"name"), actorUserId:user.id, config:{ schemaVersion:1, eligibleKinds:["TEAM"], primaryDirection:text(formData,"primaryDirection") as "ASC"|"DESC", rankStyle:text(formData,"rankStyle") as "COMPETITION"|"DENSE", visibility:"LIVE", tieBreakers:[], sources:[{ id:MachineKeySchema.parse(text(formData,"sourceId")||"main"), label:text(formData,"sourceLabel")||"Main score", dimensionKey:text(formData,"dimensionKey"), scope:text(formData,"scope") as "ACTIVITY"|"EVENT", activityInstanceIds: formData.getAll("activityIds").map(String).filter(Boolean) || undefined, weight:Number(text(formData,"weight")||1), valueDirection:text(formData,"valueDirection") as "ASC"|"DESC", attemptMode:text(formData,"attemptMode") as "SUM"|"BEST"|"LATEST"|"AVERAGE", selection }] } });
  revalidatePath(`/admin/events/${eventId}/scores`);
}

export async function addLeaderboardSource(formData: FormData) {
  const user=await userOrLogin(); const eventId=text(formData,"eventId"); await requireEventCapability(user.id,eventId,"scores.adjust");
  const selectionMode=text(formData,"selectionMode") as "ALL"|"BEST_N"|"DROP_LOWEST_N"; const count=Number(text(formData,"selectionCount")||0);
  const selection=selectionMode==="ALL"?{mode:"ALL" as const}:selectionMode==="BEST_N"?{mode:"BEST_N" as const,count:Math.max(1,count)}:{mode:"DROP_LOWEST_N" as const,count:Math.max(0,count)};
  await new LeaderboardService().addSource({ leaderboardId:text(formData,"leaderboardId"), actorUserId:user.id, source:{ id:MachineKeySchema.parse(text(formData,"sourceId")), label:text(formData,"sourceLabel"), dimensionKey:text(formData,"dimensionKey"), scope:text(formData,"scope"), activityInstanceIds: formData.getAll("activityIds").map(String).filter(Boolean), weight:Number(text(formData,"weight")||1), valueDirection:text(formData,"valueDirection"), attemptMode:text(formData,"attemptMode"), selection } });
  revalidatePath(`/admin/events/${eventId}/scores`);
}

export async function addTieBreaker(formData: FormData) {
  const user=await userOrLogin(); const eventId=text(formData,"eventId"); await requireEventCapability(user.id,eventId,"scores.adjust");
  const type=text(formData,"type"); let tieBreaker:unknown;
  if(type==="SOURCE_TOTAL") tieBreaker={type,sourceId:MachineKeySchema.parse(text(formData,"sourceId")),direction:text(formData,"direction")};
  else if(type==="SCORE_DIMENSION") tieBreaker={type,dimensionKey:text(formData,"dimensionKey"),direction:text(formData,"direction")};
  else tieBreaker={type};
  await new LeaderboardService().addTieBreaker({ leaderboardId:text(formData,"leaderboardId"), actorUserId:user.id, tieBreaker });
  revalidatePath(`/admin/events/${eventId}/scores`);
}

export async function snapshotLeaderboard(formData: FormData) {
  const user=await userOrLogin(); const eventId=text(formData,"eventId"); const state=text(formData,"state") as "PROVISIONAL"|"FINAL";
  await requireEventCapability(user.id,eventId,state==="FINAL"?"results.finalize":"results.enter");
  await new LeaderboardService().snapshot({ leaderboardId:text(formData,"leaderboardId"), state, actorUserId:user.id, reason:text(formData,"reason")||undefined });
  revalidatePath(`/admin/events/${eventId}/scores`);
}

export async function addScoreAdjustment(formData: FormData) {
  const user=await userOrLogin(); const eventId=text(formData,"eventId"); await requireEventCapability(user.id,eventId,"scores.adjust");
  const entry=await new ActivityRunService().ensureTeamEntry(eventId,text(formData,"teamId"));
  await new ScoreLedgerService().addAdjustment({ eventId, participationEntryId:entry.id, dimensionKey:MachineKeySchema.parse(text(formData,"dimensionKey")), amount:Number(text(formData,"amount")), entryType:text(formData,"entryType") as "BONUS"|"PENALTY"|"MANUAL"|"OVERRIDE_DELTA", reason:text(formData,"reason"), actorUserId:user.id, activityInstanceId:text(formData,"activityInstanceId")||undefined, idempotencyKey:text(formData,"idempotencyKey")||randomUUID() });
  revalidatePath(`/admin/events/${eventId}/scores`);
}

export async function reverseScoreEntry(formData: FormData) {
  const user=await userOrLogin(); const eventId=text(formData,"eventId"); await requireEventCapability(user.id,eventId,"scores.override");
  await new ScoreLedgerService().reverse({ scoreEntryId:text(formData,"scoreEntryId"), actorUserId:user.id, reason:text(formData,"reason")||"Organizer reversal" });
  revalidatePath(`/admin/events/${eventId}/scores`);
}

export async function applyPlacementPoints(formData: FormData) {
  const user=await userOrLogin(); const eventId=text(formData,"eventId"); await requireEventCapability(user.id,eventId,"scores.adjust");
  const raw=JSON.parse(text(formData,"rulesJson")); const rules=Array.isArray(raw)?raw.map((item)=>PlacementPointRuleSchema.parse(item)):[];
  await new PlacementService().apply({ eventId, activityInstanceId:text(formData,"activityInstanceId"), actorUserId:user.id, idempotencyKey:text(formData,"idempotencyKey")||randomUUID(), definition:{ sourceType:text(formData,"sourceType") as "SCORE"|"METRIC", sourceKey:text(formData,"sourceKey"), direction:text(formData,"direction") as "ASC"|"DESC", attemptMode:text(formData,"attemptMode") as "SUM"|"BEST"|"LATEST"|"AVERAGE", tieTolerance:Number(text(formData,"tieTolerance")||0), outputDimensionKey:MachineKeySchema.parse(text(formData,"outputDimensionKey")), rules } });
  revalidatePath(`/admin/events/${eventId}/scores`);
}
