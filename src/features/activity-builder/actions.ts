"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { requireEventCapability } from "@/server/permissions/capabilities";
import { ActivityDefinitionService } from "@/server/services/activity-definition-service";
import { getPrisma } from "@/lib/prisma";

export async function saveVisualActivityDefinition(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const eventId = String(formData.get("eventId"));
  const activityInstanceId = String(formData.get("activityInstanceId"));
  await requireEventCapability(user.id, eventId, "activities.manage");
  await requireEventCapability(user.id, eventId, "answer_keys.view");
  const activity = await getPrisma().activityInstance.findUniqueOrThrow({ where: { id: activityInstanceId }, select: { eventId: true } });
  if (activity.eventId !== eventId) throw new Error("Activity belongs to another event");
  const raw = String(formData.get("definitionJson") ?? "");
  const definition = JSON.parse(raw);
  await new ActivityDefinitionService().saveDraft({ activityInstanceId, definition, actorUserId: user.id });
  revalidatePath(`/admin/events/${eventId}/activities/${activityInstanceId}`);
  revalidatePath(`/admin/events/${eventId}/activities`);
}
