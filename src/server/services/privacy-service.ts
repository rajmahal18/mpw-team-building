import { createHash } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import { asInputJson } from "@/lib/json";
import { AuditService } from "./audit-service";

const checksum = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export class PrivacyService {
  async publishNotice(input: { organizationId: string; title: string; content: string; actorUserId: string }) {
    const title = input.title.trim();
    const content = input.content.trim();
    if (!title || !content) throw new Error("Privacy notice title and content are required");
    const notice = await getPrisma().$transaction(async (tx) => {
      const latest = await tx.privacyNotice.aggregate({ where: { organizationId: input.organizationId }, _max: { version: true } });
      await tx.privacyNotice.updateMany({ where: { organizationId: input.organizationId, publishedAt: { not: null }, retiredAt: null }, data: { retiredAt: new Date() } });
      return tx.privacyNotice.create({ data: { organizationId: input.organizationId, version: (latest._max.version ?? 0) + 1, title, content, checksum: checksum({ title, content }), effectiveAt: new Date(), publishedAt: new Date(), createdById: input.actorUserId } });
    });
    await new AuditService().record({ organizationId: input.organizationId, actorUserId: input.actorUserId, action: "PRIVACY_NOTICE_PUBLISHED", targetType: "PrivacyNotice", targetId: notice.id, after: { version: notice.version, checksum: notice.checksum } });
    return notice;
  }

  async createPia(input: { organizationId: string; eventId?: string; systemName: string; purpose: string; riskLevel: string; scope: unknown; dataInventory: unknown; risks: unknown; safeguards: unknown; actorUserId: string }) {
    if (input.eventId) {
      const event = await getPrisma().event.findFirst({ where: { id: input.eventId, organizationId: input.organizationId }, select: { id: true } });
      if (!event) throw new Error("Event does not belong to this organization");
    }
    const pia = await getPrisma().privacyImpactAssessment.create({
      data: {
        organizationId: input.organizationId,
        eventId: input.eventId,
        systemName: input.systemName.trim(),
        purpose: input.purpose.trim(),
        riskLevel: input.riskLevel.trim() || "MEDIUM",
        scopeJson: asInputJson(input.scope),
        dataInventoryJson: asInputJson(input.dataInventory),
        riskAssessmentJson: asInputJson(input.risks),
        safeguardsJson: asInputJson(input.safeguards),
        createdById: input.actorUserId,
      },
    });
    await new AuditService().record({ organizationId: input.organizationId, eventId: input.eventId, actorUserId: input.actorUserId, action: "PIA_CREATED", targetType: "PrivacyImpactAssessment", targetId: pia.id, after: { systemName: pia.systemName, riskLevel: pia.riskLevel } });
    return pia;
  }

  async approvePia(input: { organizationId: string; id: string; actorUserId: string; reviewDueAt?: Date }) {
    const before = await getPrisma().privacyImpactAssessment.findFirst({ where: { id: input.id, organizationId: input.organizationId } });
    if (!before) throw new Error("PIA not found in this organization");
    const pia = await getPrisma().privacyImpactAssessment.update({ where: { id: input.id }, data: { status: "APPROVED", approvedAt: before.approvedAt ?? new Date(), approvedById: input.actorUserId, reviewDueAt: input.reviewDueAt } });
    await new AuditService().record({ organizationId: before.organizationId, eventId: before.eventId ?? undefined, actorUserId: input.actorUserId, action: "PIA_APPROVED", targetType: "PrivacyImpactAssessment", targetId: pia.id, before: { status: before.status }, after: { status: pia.status, reviewDueAt: pia.reviewDueAt } });
    return pia;
  }
}
