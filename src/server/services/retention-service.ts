import { getPrisma } from "@/lib/prisma";
import { EventConfigSchema } from "@/schemas/event";
import { AuditService } from "./audit-service";

export class RetentionService {
  async previewEvent(eventId: string, organizationId?: string) {
    const event = await getPrisma().event.findFirst({ where: { id: eventId, ...(organizationId ? { organizationId } : {}) }, select: { id: true, organizationId: true, state: true, configJson: true } });
    if (!event) throw new Error("Event not found in this organization");
    const config = EventConfigSchema.parse(event.configJson);
    if (!config.privacy.retentionDays) return { eventId, configured: false, cutoff: null, counts: { participantSessions: 0, mediaAssets: 0, operationalReceipts: 0, domainEvents: 0, exportJobs: 0 } };
    const cutoff = new Date(Date.now() - config.privacy.retentionDays * 86_400_000);
    const [participantSessions, mediaAssets, operationalReceipts, domainEvents, exportJobs] = await Promise.all([
      getPrisma().participantSession.count({ where: { eventId, expiresAt: { lt: cutoff } } }),
      getPrisma().mediaAsset.count({ where: { eventId, createdAt: { lt: cutoff } } }),
      getPrisma().operationalReceipt.count({ where: { eventId, createdAt: { lt: cutoff } } }),
      getPrisma().domainEvent.count({ where: { eventId, createdAt: { lt: cutoff } } }),
      getPrisma().exportJob.count({ where: { eventId, createdAt: { lt: cutoff } } }),
    ]);
    return { eventId, configured: true, cutoff, counts: { participantSessions, mediaAssets, operationalReceipts, domainEvents, exportJobs } };
  }

  async purgeEvent(input: { organizationId: string; eventId: string; actorUserId: string }) {
    const event = await getPrisma().event.findFirst({ where: { id: input.eventId, organizationId: input.organizationId } });
    if (!event) throw new Error("Event not found in this organization");
    if (!["FINALIZED", "ARCHIVED", "CANCELLED"].includes(event.state)) throw new Error("Retention purge is only allowed after the event is no longer live");
    const preview = await this.previewEvent(input.eventId, input.organizationId);
    if (!preview.configured || !preview.cutoff) throw new Error("Configure an event retention period before running a purge");
    // Media references participant sessions, so delete dependent media first to satisfy FK constraints.
    const [mediaAssets, participantSessions, operationalReceipts, domainEvents, exportJobs] = await getPrisma().$transaction([
      getPrisma().mediaAsset.deleteMany({ where: { eventId: input.eventId, createdAt: { lt: preview.cutoff } } }),
      getPrisma().participantSession.deleteMany({ where: { eventId: input.eventId, expiresAt: { lt: preview.cutoff } } }),
      getPrisma().operationalReceipt.deleteMany({ where: { eventId: input.eventId, createdAt: { lt: preview.cutoff } } }),
      getPrisma().domainEvent.deleteMany({ where: { eventId: input.eventId, createdAt: { lt: preview.cutoff } } }),
      getPrisma().exportJob.deleteMany({ where: { eventId: input.eventId, createdAt: { lt: preview.cutoff } } }),
    ]);
    const deleted = { mediaAssets: mediaAssets.count, participantSessions: participantSessions.count, operationalReceipts: operationalReceipts.count, domainEvents: domainEvents.count, exportJobs: exportJobs.count };
    await new AuditService().record({ organizationId: event.organizationId, eventId: event.id, actorUserId: input.actorUserId, action: "RETENTION_PURGE", targetType: "Event", targetId: event.id, after: { cutoff: preview.cutoff, deleted }, reason: "Configured event retention policy" });
    return deleted;
  }
}
