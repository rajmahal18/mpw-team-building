import { getPrisma } from "@/lib/prisma";
import { hasEventCapability } from "@/server/permissions/capabilities";

export const DELETABLE_EVENT_STATES = ["DRAFT", "CONFIGURING", "CANCELLED"] as const;

export async function deleteEventWorkspace(eventId: string, actorUserId: string) {
  if (!(await hasEventCapability(actorUserId, eventId, "event.configure"))) throw new Error("Missing capability: event.configure");
  return getPrisma().$transaction(async (tx) => {
    const event = await tx.event.findUniqueOrThrow({ where: { id: eventId } });
    if (event.archivedAt) return;
    const changed = await tx.event.updateMany({
      where: { id: eventId, archivedAt: null, state: { in: [...DELETABLE_EVENT_STATES] } },
      data: { archivedAt: new Date(), state: "ARCHIVED" },
    });
    if (!changed.count) throw new Error("Only draft, configuring, or cancelled events can be deleted. Refresh the event list and try again.");
    await tx.auditLog.create({ data: {
      organizationId: event.organizationId, eventId, actorType: "USER", actorUserId,
      action: "EVENT_DELETED", targetType: "Event", targetId: eventId,
      beforeJson: { state: event.state }, afterJson: { state: "ARCHIVED", deletedFromWorkspace: true },
    } });
  });
}
