import { createHash } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import { asInputJson } from "@/lib/json";
import { ActivityDefinitionSchema } from "@/schemas/activity";
import { preflightActivity } from "@/engine/validation/activity-preflight";
import { AuditService } from "./audit-service";

const audit = new AuditService();
const checksum = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export class ActivityDefinitionService {
  async createActivity(input: { eventId: string; machineKey: string; title: string; actorUserId: string }) {
    return getPrisma().activityInstance.create({ data: { eventId: input.eventId, machineKey: input.machineKey, title: input.title } });
  }

  async saveDraft(input: { activityInstanceId: string; definition: unknown; actorUserId: string }) {
    const result = preflightActivity(input.definition);
    const blocking = result.issues.filter((issue) => issue.level === "ERROR");
    if (!result.definition || blocking.length) throw new Error(blocking.map((issue) => issue.message).join("; "));
    const activity = await getPrisma().activityInstance.findUniqueOrThrow({ where: { id: input.activityInstanceId }, include: { event: true, versions: true } });
    const parsed = ActivityDefinitionSchema.parse(result.definition);
    const digest = checksum(parsed);
    const identical = activity.versions.find((version) => version.checksum === digest);
    if (identical) return { version: identical, issues: result.issues };
    const nextVersion = activity.versions.reduce((max, version) => Math.max(max, version.version), 0) + 1;
    const version = await getPrisma().activityDefinitionVersion.create({
      data: {
        activityInstanceId: activity.id,
        version: nextVersion,
        state: "DRAFT",
        schemaVersion: parsed.schemaVersion,
        definitionJson: asInputJson(parsed),
        checksum: digest,
        createdById: input.actorUserId,
      },
    });
    await audit.record({ organizationId: activity.event.organizationId, eventId: activity.eventId, actorUserId: input.actorUserId, action: "ACTIVITY_UPDATED", targetType: "ActivityDefinitionVersion", targetId: version.id, after: parsed });
    return { version, issues: result.issues };
  }

  async publish(input: { versionId: string; actorUserId: string }) {
    const version = await getPrisma().activityDefinitionVersion.findUniqueOrThrow({ where: { id: input.versionId }, include: { activityInstance: { include: { event: true } } } });
    ActivityDefinitionSchema.parse(version.definitionJson);
    if (version.state === "PUBLISHED") return version;
    const updated = await getPrisma().$transaction(async (tx) => {
      await tx.activityDefinitionVersion.updateMany({ where: { activityInstanceId: version.activityInstanceId, state: "PUBLISHED" }, data: { state: "SUPERSEDED" } });
      const published = await tx.activityDefinitionVersion.update({ where: { id: version.id }, data: { state: "PUBLISHED", publishedAt: new Date() } });
      await tx.activityInstance.update({ where: { id: version.activityInstanceId }, data: { currentVersionId: published.id } });
      return published;
    });
    await audit.record({ organizationId: version.activityInstance.event.organizationId, eventId: version.activityInstance.eventId, actorUserId: input.actorUserId, action: "ACTIVITY_VERSION_PUBLISHED", targetType: "ActivityDefinitionVersion", targetId: updated.id, after: updated });
    return updated;
  }
}
