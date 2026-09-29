import { createHash } from "node:crypto";
import { ActivityDefinitionSchema } from "@/schemas/activity";
import { asInputJson } from "@/lib/json";
import { getPrisma } from "@/lib/prisma";
import { RECOMMENDED_ACTIVITY_LIBRARY, materializeTemplateDefinition } from "@/domain/activity/library-presets";
import { ActivityDefinitionService } from "./activity-definition-service";
import { AuditService } from "./audit-service";

const audit = new AuditService();
const checksum = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export class ActivityLibraryService {
  async installRecommendedLibrary(input: { organizationId: string; actorUserId: string }) {
    const installed: string[] = [];
    for (const preset of RECOMMENDED_ACTIVITY_LIBRARY) {
      const definition = ActivityDefinitionSchema.parse(preset.definition);
      const digest = checksum(definition);
      await getPrisma().$transaction(async (tx) => {
        let template = await tx.activityTemplate.findUnique({ where: { organizationId_machineKey: { organizationId: input.organizationId, machineKey: preset.machineKey } } });
        if (!template) {
          template = await tx.activityTemplate.create({
            data: { organizationId: input.organizationId, machineKey: preset.machineKey, name: preset.name, description: preset.description, categoryKey: preset.categoryKey, tags: preset.tags, isSystem: true, createdById: input.actorUserId },
          });
        } else if (!template.isSystem) {
          return;
        } else {
          template = await tx.activityTemplate.update({ where: { id: template.id }, data: { name: preset.name, description: preset.description, categoryKey: preset.categoryKey, tags: preset.tags, status: "ACTIVE" } });
        }

        const existing = await tx.activityTemplateVersion.findFirst({ where: { templateId: template.id, checksum: digest } });
        if (existing) {
          if (template.currentVersionId !== existing.id) await tx.activityTemplate.update({ where: { id: template.id }, data: { currentVersionId: existing.id } });
          installed.push(template.id);
          return;
        }
        const latest = await tx.activityTemplateVersion.aggregate({ where: { templateId: template.id }, _max: { version: true } });
        await tx.activityTemplateVersion.updateMany({ where: { templateId: template.id, state: "PUBLISHED" }, data: { state: "SUPERSEDED" } });
        const version = await tx.activityTemplateVersion.create({
          data: { templateId: template.id, version: (latest._max.version ?? 0) + 1, state: "PUBLISHED", schemaVersion: definition.schemaVersion, definitionJson: asInputJson(definition), checksum: digest, publishedAt: new Date(), createdById: input.actorUserId },
        });
        await tx.activityTemplate.update({ where: { id: template.id }, data: { currentVersionId: version.id } });
        installed.push(template.id);
      });
    }
    return installed;
  }

  async instantiate(input: { templateId: string; eventId: string; machineKey: string; title: string; actorUserId: string }) {
    const [template, event] = await Promise.all([
      getPrisma().activityTemplate.findUniqueOrThrow({ where: { id: input.templateId } }),
      getPrisma().event.findUniqueOrThrow({ where: { id: input.eventId } }),
    ]);
    if (template.organizationId !== event.organizationId) throw new Error("Template and event belong to different organizations");
    if (!template.currentVersionId) throw new Error("Template has no published version");
    const version = await getPrisma().activityTemplateVersion.findFirst({ where: { id: template.currentVersionId, templateId: template.id } });
    if (!version) throw new Error("Template current-version pointer is invalid");
    const definition = materializeTemplateDefinition(version.definitionJson, { key: input.machineKey, title: input.title });
    const activity = await getPrisma().activityInstance.create({ data: { eventId: event.id, sourceTemplateId: template.id, machineKey: input.machineKey, title: input.title } });
    await new ActivityDefinitionService().saveDraft({ activityInstanceId: activity.id, definition, actorUserId: input.actorUserId });
    await audit.record({ organizationId: event.organizationId, eventId: event.id, actorUserId: input.actorUserId, action: "ACTIVITY_CREATED_FROM_TEMPLATE", targetType: "ActivityInstance", targetId: activity.id, after: { templateId: template.id, templateVersionId: version.id } });
    return activity;
  }

  async saveActivityAsTemplate(input: { activityInstanceId: string; machineKey: string; name: string; description?: string; categoryKey?: string; tags?: string[]; actorUserId: string }) {
    const activity = await getPrisma().activityInstance.findUniqueOrThrow({ where: { id: input.activityInstanceId }, include: { event: true, versions: { orderBy: { version: "desc" }, take: 1 } } });
    const sourceVersion = activity.versions[0];
    if (!sourceVersion) throw new Error("Activity has no definition to save");
    const definition = ActivityDefinitionSchema.parse(sourceVersion.definitionJson);
    const digest = checksum(definition);
    const template = await getPrisma().$transaction(async (tx) => {
      const existing = await tx.activityTemplate.findUnique({ where: { organizationId_machineKey: { organizationId: activity.event.organizationId, machineKey: input.machineKey } } });
      if (existing) throw new Error("A library template with that machine key already exists");
      const created = await tx.activityTemplate.create({
        data: { organizationId: activity.event.organizationId, machineKey: input.machineKey, name: input.name, description: input.description, categoryKey: input.categoryKey, tags: input.tags ?? [], createdById: input.actorUserId },
      });
      const version = await tx.activityTemplateVersion.create({
        data: { templateId: created.id, version: 1, state: "PUBLISHED", schemaVersion: definition.schemaVersion, definitionJson: asInputJson(definition), checksum: digest, publishedAt: new Date(), createdById: input.actorUserId },
      });
      return tx.activityTemplate.update({ where: { id: created.id }, data: { currentVersionId: version.id } });
    });
    await audit.record({ organizationId: activity.event.organizationId, eventId: activity.eventId, actorUserId: input.actorUserId, action: "ACTIVITY_TEMPLATE_CREATED", targetType: "ActivityTemplate", targetId: template.id, after: { machineKey: template.machineKey, sourceActivityInstanceId: activity.id } });
    return template;
  }
}
