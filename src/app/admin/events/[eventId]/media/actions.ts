"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { requireEventCapability } from "@/server/permissions/capabilities";
import { getPrisma } from "@/lib/prisma";
import { MediaModerationService } from "@/server/services/media-moderation-service";

export async function moderateMedia(formData: FormData) {
  const user = await getCurrentUser(); if (!user) redirect("/login");
  const eventId = String(formData.get("eventId") || "");
  const assetId = String(formData.get("assetId") || "");
  const status = String(formData.get("status") || "") as "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN";
  const reason = String(formData.get("reason") || "").trim() || undefined;
  await requireEventCapability(user.id, eventId, "submissions.review");
  const asset = await getPrisma().mediaAsset.findUniqueOrThrow({ where: { id: assetId } });
  if (asset.eventId !== eventId) throw new Error("Media belongs to another event");
  await new MediaModerationService().setStatus({ assetId, status, actorUserId: user.id, reason });
  revalidatePath(`/admin/events/${eventId}/media`);
}
