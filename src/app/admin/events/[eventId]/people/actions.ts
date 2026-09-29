"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MachineKeySchema, TechnicalLimits } from "@/schemas/shared";
import { makeMachineKey } from "@/lib/machine-key";
import { getCurrentUser } from "@/server/auth/session";
import { requireEventCapability } from "@/server/permissions/capabilities";
import { EventService } from "@/server/services/event-service";
import { RosterService } from "@/server/services/roster-service";

async function userOrLogin() { const user = await getCurrentUser(); if (!user) redirect("/login"); return user; }
const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const optional = (form: FormData, key: string) => text(form, key) || undefined;
const refresh = (eventId: string) => revalidatePath(`/admin/events/${eventId}/people`);

export async function createTeam(formData: FormData) {
  const user = await userOrLogin(); const eventId = text(formData,"eventId"); await requireEventCapability(user.id,eventId,"teams.manage");
  const name=text(formData,"name");
  await new EventService().addTeam({ eventId, machineKey:makeMachineKey(name,"team"), name, abbreviation:optional(formData,"abbreviation"), colorToken:optional(formData,"colorToken"), logoAssetId:optional(formData,"logoAssetId"), teamCode:optional(formData,"teamCode"), actorUserId:user.id }); refresh(eventId);
}
export async function bulkCreateTeams(formData: FormData) {
  const user = await userOrLogin(); const eventId = text(formData,"eventId"); await requireEventCapability(user.id,eventId,"teams.manage");
  const count=Number(text(formData,"count")); if(!Number.isInteger(count)||count<1||count>TechnicalLimits.maxTeamsPerBulkOperation) throw new Error(`Team count must be between 1 and ${TechnicalLimits.maxTeamsPerBulkOperation}`);
  const namePrefix=text(formData,"namePrefix")||"Team"; const keyPrefix=MachineKeySchema.parse(text(formData,"keyPrefix")||"team"); const start=Number(text(formData,"startNumber")||1); if(!Number.isInteger(start)||start<0) throw new Error("Start number must be a non-negative integer");
  const service=new EventService(); for(let index=0; index<count; index+=1){const number=start+index; await service.addTeam({eventId,machineKey:MachineKeySchema.parse(`${keyPrefix}-${number}`),name:`${namePrefix} ${number}`,actorUserId:user.id});} refresh(eventId);
}
export async function updateTeam(formData: FormData) {
  const user=await userOrLogin(); const eventId=text(formData,"eventId"); await requireEventCapability(user.id,eventId,"teams.manage");
  await new EventService().updateTeam({eventId,teamId:text(formData,"teamId"),name:text(formData,"name"),abbreviation:optional(formData,"abbreviation"),colorToken:optional(formData,"colorToken"),logoAssetId:optional(formData,"logoAssetId"),teamCode:optional(formData,"teamCode"),actorUserId:user.id}); refresh(eventId);
}
export async function archiveTeam(formData: FormData) {
  const user=await userOrLogin(); const eventId=text(formData,"eventId"); await requireEventCapability(user.id,eventId,"teams.manage"); await new EventService().archiveTeam({eventId,teamId:text(formData,"teamId"),actorUserId:user.id}); refresh(eventId);
}
export async function addParticipant(formData: FormData) {
  const user=await userOrLogin(); const eventId=text(formData,"eventId"); await requireEventCapability(user.id,eventId,"roster.manage"); await new RosterService().addParticipant({eventId,displayName:text(formData,"displayName"),externalKey:optional(formData,"externalKey"),teamId:optional(formData,"teamId"),roleKey:optional(formData,"roleKey"),actorUserId:user.id}); refresh(eventId);
}
export async function assignParticipantTeam(formData: FormData) {
  const user=await userOrLogin(); const eventId=text(formData,"eventId"); await requireEventCapability(user.id,eventId,"roster.manage"); await new RosterService().assignTeam({eventId,eventParticipantId:text(formData,"eventParticipantId"),teamId:optional(formData,"teamId"),roleKey:optional(formData,"roleKey"),actorUserId:user.id}); refresh(eventId);
}
