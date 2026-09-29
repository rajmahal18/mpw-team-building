"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { requireEventCapability } from "@/server/permissions/capabilities";
import { ActivityDefinitionService } from "@/server/services/activity-definition-service";
import { ActivityLibraryService } from "@/server/services/activity-library-service";
import { createStarterDefinition } from "@/domain/activity/starter-definition";
import { MachineKeySchema } from "@/schemas/shared";

async function userOrLogin() { const user = await getCurrentUser(); if (!user) redirect("/login"); return user; }
const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function addBlankActivity(formData: FormData) {
  const user = await userOrLogin();
  const eventId = text(formData, "eventId");
  await requireEventCapability(user.id, eventId, "activities.manage");
  const machineKey = MachineKeySchema.parse(text(formData, "machineKey"));
  const title = text(formData, "title");
  const service = new ActivityDefinitionService();
  const activity = await service.createActivity({ eventId, machineKey, title, actorUserId: user.id });
  await service.saveDraft({ activityInstanceId: activity.id, definition: createStarterDefinition(machineKey, title), actorUserId: user.id });
  redirect(`/admin/events/${eventId}/activities/${activity.id}`);
}

export async function saveActivityToLibrary(formData: FormData) {
  const user = await userOrLogin();
  const eventId = text(formData, "eventId");
  await requireEventCapability(user.id, eventId, "activities.manage");
  await new ActivityLibraryService().saveActivityAsTemplate({
    activityInstanceId: text(formData, "activityInstanceId"), machineKey: MachineKeySchema.parse(text(formData, "machineKey")), name: text(formData, "name"), description: text(formData, "description") || undefined, categoryKey: text(formData, "categoryKey") || undefined, tags: text(formData, "tags").split(",").map((tag) => tag.trim()).filter(Boolean), actorUserId: user.id,
  });
  revalidatePath(`/admin/events/${eventId}/library`);
  revalidatePath(`/admin/events/${eventId}/activities`);
}
