"use server";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { EventService } from "@/server/services/event-service";
import { requirePlatformCapability } from "@/server/permissions/capabilities";
import { getPrisma } from "@/lib/prisma";
import { MachineKeySchema } from "@/schemas/shared";
import { revalidatePath } from "next/cache";
import { deleteEventWorkspace } from "@/server/services/event-delete-service";

export async function deleteEvent(eventId: string, _previous: { error: string }, _formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: "Your session has expired. Sign in and try again." };
  try {
    await deleteEventWorkspace(eventId, user.id);
  } catch {
    return { error: "Could not delete this event. Check your permissions and refresh the list; only draft, configuring, or cancelled events can be deleted." };
  }
  revalidatePath("/admin");
  return { error: "" };
}

function slugify(value: string) {
  const normalized = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return normalized || "event";
}

async function uniqueEventSlug(name: string) {
  const prisma = getPrisma();
  const base = MachineKeySchema.parse(slugify(name));
  let candidate = base;
  let suffix = 2;
  while (await prisma.event.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = MachineKeySchema.parse(`${base.slice(0, Math.max(1, 96 - String(suffix).length))}-${suffix}`);
    suffix += 1;
  }
  return candidate;
}

export async function createEvent(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await requirePlatformCapability(user.id, "events.create");
  const organization = await getPrisma().organization.findFirstOrThrow();
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Event name is required");
  const slug = await uniqueEventSlug(name);
  const event = await new EventService().create({ organizationId: organization.id, name, slug, actorUserId: user.id });
  redirect(`/admin/events/${event.id}/setup`);
}
