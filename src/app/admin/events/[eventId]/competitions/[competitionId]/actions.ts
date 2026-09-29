"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { requireEventCapability } from "@/server/permissions/capabilities";
import { getPrisma } from "@/lib/prisma";
import { CompetitionService } from "@/server/services/competition-service";

const text=(form:FormData,key:string)=>String(form.get(key)??"").trim();
async function userOrLogin(){const user=await getCurrentUser();if(!user)redirect("/login");return user;}

export async function recordMatchResult(formData: FormData) {
  const user=await userOrLogin();const eventId=text(formData,"eventId");await requireEventCapability(user.id,eventId,"matches.officiate");
  const matchId=text(formData,"matchId");const match=await getPrisma().match.findUniqueOrThrow({where:{id:matchId},include:{competition:true,sides:true}});if(match.competition.eventId!==eventId)throw new Error("Match belongs to another event");
  const sideScores=match.sides.flatMap((side)=>{const raw=text(formData,`score:${side.participationEntryId}`);return raw===""?[]:[{entryId:side.participationEntryId,score:Number(raw)}];});
  const winner=text(formData,"winnerEntryId");
  await new CompetitionService().recordMatchResult({matchId,result:{winnerEntryId:winner||null,sideScores,note:text(formData,"note")||undefined},actorUserId:user.id,idempotencyKey:text(formData,"idempotencyKey")||randomUUID()});
  revalidatePath(`/admin/events/${eventId}/competitions/${match.competitionId}`);
}

export async function finalizeCompetition(formData: FormData) {
  const user=await userOrLogin();const eventId=text(formData,"eventId");await requireEventCapability(user.id,eventId,"results.finalize");
  const competitionId=text(formData,"competitionId");const competition=await getPrisma().competition.findUniqueOrThrow({where:{id:competitionId}});if(competition.eventId!==eventId)throw new Error("Competition belongs to another event");
  await new CompetitionService().finalizeCompetition({competitionId,actorUserId:user.id,reason:text(formData,"reason")||undefined});revalidatePath(`/admin/events/${eventId}/competitions/${competitionId}`);
}
