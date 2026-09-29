"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MachineKeySchema } from "@/schemas/shared";
import { makeMachineKey } from "@/lib/machine-key";
import { getCurrentUser } from "@/server/auth/session";
import { requireEventCapability } from "@/server/permissions/capabilities";
import { getPrisma } from "@/lib/prisma";
import { ActivityLibraryService } from "@/server/services/activity-library-service";

async function userOrLogin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function installRecommendedLibrary(formData: FormData) {
  const user = await userOrLogin();
  const eventId = text(formData, "eventId");
  await requireEventCapability(user.id, eventId, "activities.manage");
  const event = await getPrisma().event.findUniqueOrThrow({ where: { id: eventId } });
  await new ActivityLibraryService().installRecommendedLibrary({ organizationId: event.organizationId, actorUserId: user.id });
  revalidatePath(`/admin/events/${eventId}/library`);
}

export async function addTemplateToEvent(formData: FormData) {
  const user = await userOrLogin();
  const eventId = text(formData, "eventId");
  await requireEventCapability(user.id, eventId, "activities.manage");
  const activity = await new ActivityLibraryService().instantiate({
    templateId: text(formData, "templateId"), eventId,
    machineKey: makeMachineKey(text(formData, "title"), "activity"), title: text(formData, "title"), actorUserId: user.id,
  });
  redirect(`/admin/events/${eventId}/activities/${activity.id}`);
}
