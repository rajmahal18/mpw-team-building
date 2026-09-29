import { getPrisma } from "@/lib/prisma";
import { AuditService } from "./audit-service";

export class AnnouncementService {
  async publish(input: { eventId: string; message: string; title?: string; audienceKind?: "ALL" | "TEAM" | "MARSHAL"; audienceRefId?: string; expiresAt?: Date; actorUserId: string }) {
    const event = await getPrisma().event.findUniqueOrThrow({ where: { id: input.eventId } });
    const message = input.message.trim();
    if (!message) throw new Error("Announcement message is required");
    if (input.audienceKind === "TEAM" && !input.audienceRefId) throw new Error("Team announcement needs a team target");
    if (input.audienceKind === "TEAM") {
      const team = await getPrisma().team.findUniqueOrThrow({ where: { id: input.audienceRefId } });
      if (team.eventId !== event.id) throw new Error("Announcement team belongs to another event");
    }
    const announcement = await getPrisma().eventAnnouncement.create({ data: { eventId: event.id, status: "LIVE", audienceKind: input.audienceKind ?? "ALL", audienceRefId: input.audienceRefId, title: input.title?.trim() || undefined, message, expiresAt: input.expiresAt, createdById: input.actorUserId } });
    await new AuditService().record({ organizationId: event.organizationId, eventId: event.id, actorUserId: input.actorUserId, action: "ANNOUNCEMENT_PUBLISHED", targetType: "EventAnnouncement", targetId: announcement.id, after: { audienceKind: announcement.audienceKind, audienceRefId: announcement.audienceRefId } });
    return announcement;
  }

  async retract(input: { announcementId: string; actorUserId: string; reason?: string }) {
    const announcement = await getPrisma().eventAnnouncement.findUniqueOrThrow({ where: { id: input.announcementId }, include: { event: true } });
    if (announcement.status === "RETRACTED") return announcement;
    const updated = await getPrisma().eventAnnouncement.update({ where: { id: announcement.id }, data: { status: "RETRACTED" } });
    await new AuditService().record({ organizationId: announcement.event.organizationId, eventId: announcement.eventId, actorUserId: input.actorUserId, action: "ANNOUNCEMENT_RETRACTED", targetType: "EventAnnouncement", targetId: announcement.id, reason: input.reason });
    return updated;
  }

  async listLive(eventId: string, teamId?: string) {
    const now = new Date();
    return getPrisma().eventAnnouncement.findMany({
      where: {
        eventId,
        status: "LIVE",
        startsAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        AND: [{ OR: [{ audienceKind: "ALL" }, ...(teamId ? [{ audienceKind: "TEAM", audienceRefId: teamId }] : [])] }],
      },
      orderBy: { startsAt: "desc" },
    });
  }
}
