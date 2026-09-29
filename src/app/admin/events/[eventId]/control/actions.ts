"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { requireEventCapability } from "@/server/permissions/capabilities";
import { AnnouncementService } from "@/server/services/announcement-service";
import { StationService } from "@/server/services/station-service";
import { getPrisma } from "@/lib/prisma";

async function userOrLogin() { const user = await getCurrentUser(); if (!user) redirect("/login"); return user; }
const pathFor = (eventId: string) => `/admin/events/${eventId}/control`;

export async function publishAnnouncement(formData: FormData) {
  const user = await userOrLogin(); const eventId = String(formData.get("eventId"));
  await requireEventCapability(user.id, eventId, "announcements.manage");
  const audienceKind = String(formData.get("audienceKind") || "ALL") as "ALL" | "TEAM" | "MARSHAL";
  const rawExpires = String(formData.get("expiresAt") || "").trim();
  await new AnnouncementService().publish({ eventId, title: String(formData.get("title") || "").trim() || undefined, message: String(formData.get("message") || ""), audienceKind, audienceRefId: audienceKind === "TEAM" ? String(formData.get("audienceRefId") || "") : undefined, expiresAt: rawExpires ? new Date(rawExpires) : undefined, actorUserId: user.id });
  revalidatePath(pathFor(eventId));
}

export async function retractAnnouncement(formData: FormData) {
  const user = await userOrLogin(); const eventId = String(formData.get("eventId"));
  await requireEventCapability(user.id, eventId, "announcements.manage");
  await new AnnouncementService().retract({ announcementId: String(formData.get("announcementId")), actorUserId: user.id, reason: String(formData.get("reason") || "Retracted from live control") });
  revalidatePath(pathFor(eventId));
}

export async function rerouteStationTraffic(formData: FormData) {
  const user = await userOrLogin(); const eventId = String(formData.get("eventId"));
  await requireEventCapability(user.id, eventId, "stations.operate");
  await new StationService().rerouteStationTraffic({ eventId, fromStationId: String(formData.get("fromStationId")), toStationId: String(formData.get("toStationId")), reason: String(formData.get("reason") || "").trim(), idempotencyKey: String(formData.get("idempotencyKey")), actorUserId: user.id });
  revalidatePath(pathFor(eventId)); revalidatePath(`/admin/events/${eventId}/stations`);
}

export async function bulkStationState(formData: FormData) {
  const user = await userOrLogin(); const eventId = String(formData.get("eventId")); const target = String(formData.get("target"));
  await requireEventCapability(user.id, eventId, "stations.operate");
  const stations = await getPrisma().station.findMany({ where: { eventId } });
  const service = new StationService();
  for (const station of stations) {
    const allowed = target === "OPEN" ? ["READY","PAUSED","CLOSED"].includes(station.status) : target === "PAUSED" ? station.status === "OPEN" : target === "CLOSED" ? ["OPEN","PAUSED"].includes(station.status) : false;
    if (allowed) await service.setState(station.id, target as "OPEN"|"PAUSED"|"CLOSED", user.id);
  }
  revalidatePath(pathFor(eventId)); revalidatePath(`/admin/events/${eventId}/stations`);
}
