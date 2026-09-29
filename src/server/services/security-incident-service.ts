import { getPrisma } from "@/lib/prisma";
import { AuditService } from "./audit-service";

export class SecurityIncidentService {
  async create(input: {
    organizationId: string;
    eventId?: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    category: string;
    title: string;
    description: string;
    actorUserId: string;
    notificationDueAt?: Date;
    affectedSubjectsCount?: number;
  }) {
    if (input.eventId) {
      const event = await getPrisma().event.findFirst({ where: { id: input.eventId, organizationId: input.organizationId }, select: { id: true } });
      if (!event) throw new Error("Event does not belong to this organization");
    }
    const incident = await getPrisma().securityIncident.create({
      data: {
        organizationId: input.organizationId,
        eventId: input.eventId,
        severity: input.severity,
        category: input.category,
        title: input.title,
        description: input.description,
        notificationDueAt: input.notificationDueAt,
        affectedSubjectsCount: input.affectedSubjectsCount,
        createdById: input.actorUserId,
      },
    });
    await new AuditService().record({ organizationId: input.organizationId, eventId: input.eventId, actorUserId: input.actorUserId, action: "SECURITY_INCIDENT_CREATED", targetType: "SecurityIncident", targetId: incident.id, after: { severity: incident.severity, category: incident.category, title: incident.title } });
    return incident;
  }

  async updateStatus(input: { organizationId: string; id: string; status: "OPEN" | "CONTAINED" | "RESOLVED" | "CLOSED"; actorUserId: string; reason?: string }) {
    const before = await getPrisma().securityIncident.findFirst({ where: { id: input.id, organizationId: input.organizationId } });
    if (!before) throw new Error("Security incident not found in this organization");
    const now = new Date();
    const updated = await getPrisma().securityIncident.update({
      where: { id: input.id },
      data: {
        status: input.status,
        ...(input.status === "CONTAINED" ? { containedAt: before.containedAt ?? now } : {}),
        ...(input.status === "RESOLVED" ? { resolvedAt: before.resolvedAt ?? now } : {}),
        ...(input.status === "CLOSED" ? { closedAt: before.closedAt ?? now } : {}),
        updatedById: input.actorUserId,
      },
    });
    await new AuditService().record({ organizationId: before.organizationId, eventId: before.eventId ?? undefined, actorUserId: input.actorUserId, action: "SECURITY_INCIDENT_STATUS_UPDATED", targetType: "SecurityIncident", targetId: input.id, before: { status: before.status }, after: { status: updated.status }, reason: input.reason });
    return updated;
  }
}
