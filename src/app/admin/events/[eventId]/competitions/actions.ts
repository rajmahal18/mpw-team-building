"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { requireEventCapability } from "@/server/permissions/capabilities";
import { MachineKeySchema } from "@/schemas/shared";
import { makeMachineKey } from "@/lib/machine-key";
import { ActivityRunService } from "@/server/services/activity-run-service";
import { CompetitionService } from "@/server/services/competition-service";

const text=(form:FormData,key:string)=>String(form.get(key)??"").trim();
async function userOrLogin(){const user=await getCurrentUser();if(!user)redirect("/login");return user;}

export async function createCompetition(formData: FormData) {
  const user=await userOrLogin();const eventId=text(formData,"eventId");await requireEventCapability(user.id,eventId,"competitions.manage");
  const teamIds=formData.getAll("teamIds").map(String).filter(Boolean);if(teamIds.length<2)throw new Error("Select at least two teams");
  const runService=new ActivityRunService();const entries=[];for(const teamId of teamIds)entries.push(await runService.ensureTeamEntry(eventId,teamId));
  const service=new CompetitionService();const common={eventId,activityInstanceId:text(formData,"activityInstanceId")||undefined,machineKey:makeMachineKey(text(formData,"name"),"competition"),name:text(formData,"name"),entryIds:entries.map((entry)=>entry.id),actorUserId:user.id};
  const format=text(formData,"format");
  const competition=format==="single_elimination"?await service.createSingleElimination({...common,config:{}}):await service.createRoundRobin({...common,config:{winPoints:Number(text(formData,"winPoints")||3),drawPoints:Number(text(formData,"drawPoints")||1),lossPoints:Number(text(formData,"lossPoints")||0),allowDraws:text(formData,"allowDraws")!=="false"}});
  redirect(`/admin/events/${eventId}/competitions/${competition.id}`);
}

export async function syncCompetitionEntries(formData: FormData) {
  const user=await userOrLogin();const eventId=text(formData,"eventId");await requireEventCapability(user.id,eventId,"competitions.manage");await new ActivityRunService().ensureActiveTeamEntries(eventId);revalidatePath(`/admin/events/${eventId}/competitions`);
}
