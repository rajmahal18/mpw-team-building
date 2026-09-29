"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { requireEventCapability } from "@/server/permissions/capabilities";
import { StationService } from "@/server/services/station-service";

async function userOrLogin() { const user = await getCurrentUser(); if (!user) redirect("/login"); return user; }
function paths(eventId: string, stationId: string) { revalidatePath(`/admin/events/${eventId}/stations/${stationId}`); revalidatePath(`/admin/events/${eventId}/control`); }

export async function callNext(formData: FormData) {
  const user = await userOrLogin(); const eventId = String(formData.get("eventId")); const stationId = String(formData.get("stationId"));
  await requireEventCapability(user.id, eventId, "stations.operate");
  await new StationService().callNext({ eventId, stationId, idempotencyKey: String(formData.get("idempotencyKey")), actorUserId: user.id }); paths(eventId, stationId);
}
export async function startVisit(formData: FormData) {
  const user = await userOrLogin(); const eventId = String(formData.get("eventId")); const stationId = String(formData.get("stationId"));
  await requireEventCapability(user.id, eventId, "stations.operate");
  await new StationService().startVisit({ eventId, visitId: String(formData.get("visitId")), idempotencyKey: String(formData.get("idempotencyKey")), actorUserId: user.id }); paths(eventId, stationId);
}
export async function completeVisit(formData: FormData) {
  const user = await userOrLogin(); const eventId = String(formData.get("eventId")); const stationId = String(formData.get("stationId"));
  await requireEventCapability(user.id, eventId, "stations.operate");
  await new StationService().completeVisit({ eventId, visitId: String(formData.get("visitId")), idempotencyKey: String(formData.get("idempotencyKey")), actorUserId: user.id }); paths(eventId, stationId);
}
export async function skipVisit(formData: FormData) {
  const user = await userOrLogin(); const eventId = String(formData.get("eventId")); const stationId = String(formData.get("stationId"));
  await requireEventCapability(user.id, eventId, "stations.operate");
  await new StationService().skipVisit({ eventId, visitId: String(formData.get("visitId")), idempotencyKey: String(formData.get("idempotencyKey")), actorUserId: user.id, reason: String(formData.get("reason") || "").trim() }); paths(eventId, stationId);
}
export async function rerouteVisit(formData: FormData) {
  const user = await userOrLogin(); const eventId = String(formData.get("eventId")); const stationId = String(formData.get("stationId"));
  await requireEventCapability(user.id, eventId, "stations.operate");
  await new StationService().rerouteVisit({ eventId, visitId: String(formData.get("visitId")), targetStationId: String(formData.get("targetStationId")), idempotencyKey: String(formData.get("idempotencyKey")), actorUserId: user.id, reason: String(formData.get("reason") || "").trim() }); paths(eventId, stationId);
}
