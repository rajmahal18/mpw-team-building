"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { requireEventCapability } from "@/server/permissions/capabilities";
import { StationService } from "@/server/services/station-service";
import { CheckpointCredentialService } from "@/server/services/checkpoint-credential-service";
import { StationConfigSchema } from "@/schemas/flow";
import { getPrisma } from "@/lib/prisma";
import type { StationState } from "@/generated/prisma/client";
import { makeMachineKey } from "@/lib/machine-key";

async function userOrLogin() { const user = await getCurrentUser(); if (!user) redirect("/login"); return user; }
const eventPath = (eventId: string) => `/admin/events/${eventId}/stations`;

export async function createStation(formData: FormData) {
  const user = await userOrLogin(); const eventId = String(formData.get("eventId"));
  await requireEventCapability(user.id, eventId, "stations.manage");
  const rawCapacity = String(formData.get("capacity") || "").trim();
  const name = String(formData.get("name")).trim();
  await new StationService().create({ eventId, machineKey: makeMachineKey(name, "station"), name, capacity: rawCapacity ? Number(rawCapacity) : undefined, config: StationConfigSchema.parse({ locationLabel: String(formData.get("locationLabel") || "").trim() || undefined, instructions: String(formData.get("instructions") || "").trim() || undefined, participantMessage: String(formData.get("participantMessage") || "").trim() || undefined, queuePolicy: String(formData.get("queuePolicy") || "FIFO"), autoCallNext: formData.get("autoCallNext") === "on", allowWalkIn: formData.get("allowWalkIn") === "on" }), actorUserId: user.id });
  revalidatePath(eventPath(eventId));
}

export async function updateStation(formData: FormData) {
  const user = await userOrLogin(); const eventId = String(formData.get("eventId"));
  await requireEventCapability(user.id, eventId, "stations.manage");
  const stationId = String(formData.get("stationId"));
  const station = await getPrisma().station.findUniqueOrThrow({ where: { id: stationId } });
  if (station.eventId !== eventId) throw new Error("Station belongs to another event");
  const rawCapacity = String(formData.get("capacity") || "").trim();
  const current = StationConfigSchema.parse(station.configJson ?? {});
  await new StationService().update({ stationId, name: String(formData.get("name") || station.name), capacity: rawCapacity ? Number(rawCapacity) : null, config: { ...current, locationLabel: String(formData.get("locationLabel") || "").trim() || undefined, instructions: String(formData.get("instructions") || "").trim() || undefined, participantMessage: String(formData.get("participantMessage") || "").trim() || undefined, queuePolicy: String(formData.get("queuePolicy") || "FIFO"), autoCallNext: formData.get("autoCallNext") === "on", allowWalkIn: formData.get("allowWalkIn") === "on" }, actorUserId: user.id });
  revalidatePath(eventPath(eventId)); revalidatePath(`${eventPath(eventId)}/${stationId}`);
}

export async function assignStationActivity(formData: FormData) {
  const user = await userOrLogin(); const eventId = String(formData.get("eventId"));
  await requireEventCapability(user.id, eventId, "stations.manage");
  await new StationService().assignActivity({ stationId: String(formData.get("stationId")), activityInstanceId: String(formData.get("activityInstanceId")), sortOrder: Number(formData.get("sortOrder") || 0) });
  revalidatePath(eventPath(eventId));
}

export async function unassignStationActivity(formData: FormData) {
  const user = await userOrLogin(); const eventId = String(formData.get("eventId"));
  await requireEventCapability(user.id, eventId, "stations.manage");
  await new StationService().unassignActivity(String(formData.get("stationId")), String(formData.get("activityInstanceId")));
  revalidatePath(eventPath(eventId));
}

export async function changeStationState(formData: FormData) {
  const user = await userOrLogin(); const eventId = String(formData.get("eventId"));
  await requireEventCapability(user.id, eventId, "stations.operate");
  await new StationService().setState(String(formData.get("stationId")), String(formData.get("to")) as StationState, user.id);
  revalidatePath(eventPath(eventId)); revalidatePath(`/admin/events/${eventId}/control`);
}

export async function rotateCheckpointQr(formData: FormData) {
  const user = await userOrLogin(); const eventId = String(formData.get("eventId"));
  await requireEventCapability(user.id, eventId, "stations.manage");
  const rawExpiry = String(formData.get("expiresAt") || "").trim();
  await new CheckpointCredentialService().rotate({ stationId: String(formData.get("stationId")), expiresAt: rawExpiry ? new Date(rawExpiry) : undefined, label: String(formData.get("label") || "").trim() || undefined, actorUserId: user.id });
  revalidatePath(eventPath(eventId));
}

export async function revokeCheckpointQr(formData: FormData) {
  const user = await userOrLogin(); const eventId = String(formData.get("eventId"));
  await requireEventCapability(user.id, eventId, "stations.manage");
  await new CheckpointCredentialService().revoke({ credentialId: String(formData.get("credentialId")), actorUserId: user.id, reason: String(formData.get("reason") || "Rotated by organizer") });
  revalidatePath(eventPath(eventId));
}

export async function assignStationStaff(formData: FormData) {
  const user = await userOrLogin(); const eventId = String(formData.get("eventId"));
  await requireEventCapability(user.id, eventId, "stations.manage");
  await new StationService().assignStaff({ stationId: String(formData.get("stationId")), userAccountId: String(formData.get("userAccountId")), roleKey: String(formData.get("roleKey") || "marshal"), actorUserId: user.id });
  revalidatePath(eventPath(eventId));
}
