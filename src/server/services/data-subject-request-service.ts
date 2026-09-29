import { getPrisma } from "@/lib/prisma";
import { asInputJson } from "@/lib/json";
import { AuditService } from "./audit-service";

export class DataSubjectRequestService {
  async create(input: { organizationId: string; eventId?: string; personId?: string; requestType: "ACCESS" | "RECTIFICATION" | "ERASURE" | "RESTRICTION" | "OBJECTION" | "PORTABILITY" | "OTHER"; subjectName: string; subjectContact?: string; details?: unknown; actorUserId?: string }) {
    if (input.eventId) {
      const event = await getPrisma().event.findFirst({ where: { id: input.eventId, organizationId: input.organizationId }, select: { id: true } });
      if (!event) throw new Error("Event does not belong to this organization");
    }
    if (input.personId) {
      const person = await getPrisma().person.findFirst({ where: { id: input.personId, organizationId: input.organizationId }, select: { id: true } });
      if (!person) throw new Error("Person does not belong to this organization");
    }
    const request = await getPrisma().dataSubjectRequest.create({ data: { organizationId: input.organizationId, eventId: input.eventId, personId: input.personId, requestType: input.requestType, subjectName: input.subjectName, subjectContact: input.subjectContact, requestJson: input.details === undefined ? undefined : asInputJson(input.details), createdById: input.actorUserId } });
    await new AuditService().record({ organizationId: input.organizationId, eventId: input.eventId, actorUserId: input.actorUserId, action: "DATA_SUBJECT_REQUEST_CREATED", targetType: "DataSubjectRequest", targetId: request.id, after: { requestType: request.requestType, status: request.status } });
    return request;
  }

  async updateStatus(input: { organizationId: string; id: string; status: "RECEIVED" | "VERIFYING" | "IN_REVIEW" | "FULFILLED" | "DENIED" | "CLOSED"; actorUserId: string; response?: unknown; reason?: string }) {
    const before = await getPrisma().dataSubjectRequest.findFirst({ where: { id: input.id, organizationId: input.organizationId } });
    if (!before) throw new Error("Data-subject request not found in this organization");
    const now = new Date();
    const updated = await getPrisma().dataSubjectRequest.update({ where: { id: input.id }, data: { status: input.status, responseJson: input.response === undefined ? undefined : asInputJson(input.response), verifiedAt: input.status === "IN_REVIEW" ? now : undefined, closedAt: ["FULFILLED", "DENIED", "CLOSED"].includes(input.status) ? now : undefined, updatedById: input.actorUserId } });
    await new AuditService().record({ organizationId: before.organizationId, eventId: before.eventId ?? undefined, actorUserId: input.actorUserId, action: "DATA_SUBJECT_REQUEST_STATUS_UPDATED", targetType: "DataSubjectRequest", targetId: input.id, before: { status: before.status }, after: { status: updated.status }, reason: input.reason });
    return updated;
  }
}
