import { getPrisma } from "@/lib/prisma";
import { asInputJson } from "@/lib/json";
import { DEFAULT_EVENT_CONFIG, EventBrandingConfigSchema, EventConfigSchema, type EventBrandingConfig, type EventConfig } from "@/schemas/event";
import { hashSecret } from "@/server/auth/password";
import { AuditService, sanitizeAuditValue } from "./audit-service";

const audit = new AuditService();

export class EventService {
  async create(input: { organizationId: string; name: string; slug: string; timezone?: string; actorUserId: string }) {
    const config = EventConfigSchema.parse(DEFAULT_EVENT_CONFIG);
    const latestPrivacyNotice = await getPrisma().privacyNotice.findFirst({ where: { organizationId: input.organizationId, publishedAt: { not: null }, retiredAt: null }, orderBy: { version: "desc" } });
    const event = await getPrisma().event.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        slug: input.slug,
        timezone: input.timezone || "Asia/Manila",
        state: "CONFIGURING",
        configJson: asInputJson(config),
        privacyNoticeId: latestPrivacyNotice?.id,
      },
    });
    const ownerRole = await getPrisma().eventRole.create({
      data: {
        eventId: event.id,
        name: "Event Owner",
        machineKey: "event_owner",
        capabilities: ["event.read","event.configure","event.publish","event.lock","event.start_pause_resume","event.finalize","teams.read","teams.manage","roster.manage","activities.read","activities.manage","answer_keys.view","stations.manage","stations.operate","routes.manage","announcements.manage","competitions.manage","matches.officiate","submissions.review","results.enter","results.finalize","scores.adjust","scores.override","audit.view","reports.export","roles.manage"],
      },
    });
    await getPrisma().eventRoleAssignment.create({ data: { eventRoleId: ownerRole.id, userAccountId: input.actorUserId } });
    await audit.record({ organizationId: input.organizationId, eventId: event.id, actorUserId: input.actorUserId, action: "EVENT_CREATED", targetType: "Event", targetId: event.id, after: event });
    return event;
  }


  async updateSetup(input: {
    eventId: string;
    name: string;
    shortName?: string;
    slug: string;
    timezone: string;
    startsAt?: Date;
    endsAt?: Date;
    config: EventConfig;
    branding: EventBrandingConfig;
    actorUserId: string;
  }) {
    if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) throw new Error("Event end must be after event start");
    const config = EventConfigSchema.parse(input.config);
    const branding = EventBrandingConfigSchema.parse(input.branding);
    return getPrisma().$transaction(async (tx) => {
      const before = await tx.event.findUniqueOrThrow({ where: { id: input.eventId } });
      const updated = await tx.event.update({
        where: { id: input.eventId },
        data: {
          name: input.name,
          shortName: input.shortName || null,
          slug: input.slug,
          timezone: input.timezone,
          startsAt: input.startsAt ?? null,
          endsAt: input.endsAt ?? null,
          configJson: asInputJson(config),
          brandingJson: asInputJson(branding),
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: updated.organizationId,
          eventId: updated.id,
          actorType: "USER",
          actorUserId: input.actorUserId,
          action: "EVENT_SETTINGS_UPDATED",
          targetType: "Event",
          targetId: updated.id,
          beforeJson: asInputJson(sanitizeAuditValue({ details: before, config: before.configJson, branding: before.brandingJson })),
          afterJson: asInputJson(sanitizeAuditValue({ details: updated, config, branding })),
        },
      });
      return updated;
    });
  }

  async updateDetails(input: { eventId: string; name: string; shortName?: string; slug: string; timezone: string; startsAt?: Date; endsAt?: Date; actorUserId: string }) {
    const before = await getPrisma().event.findUniqueOrThrow({ where: { id: input.eventId } });
    if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) throw new Error("Event end must be after event start");
    const event = await getPrisma().event.update({
      where: { id: input.eventId },
      data: { name: input.name, shortName: input.shortName || null, slug: input.slug, timezone: input.timezone, startsAt: input.startsAt ?? null, endsAt: input.endsAt ?? null },
    });
    await audit.record({ organizationId: event.organizationId, eventId: event.id, actorUserId: input.actorUserId, action: "EVENT_DETAILS_UPDATED", targetType: "Event", targetId: event.id, before, after: event });
    return event;
  }

  async updateConfiguration(input: { eventId: string; config: EventConfig; actorUserId: string }) {
    const event = await getPrisma().event.findUniqueOrThrow({ where: { id: input.eventId } });
    const config = EventConfigSchema.parse(input.config);
    const updated = await getPrisma().event.update({ where: { id: event.id }, data: { configJson: asInputJson(config) } });
    await audit.record({ organizationId: event.organizationId, eventId: event.id, actorUserId: input.actorUserId, action: "EVENT_CONFIG_UPDATED", targetType: "Event", targetId: event.id, before: event.configJson, after: config });
    return updated;
  }

  async updateBranding(input: { eventId: string; branding: EventBrandingConfig; actorUserId: string }) {
    const event = await getPrisma().event.findUniqueOrThrow({ where: { id: input.eventId } });
    const branding = EventBrandingConfigSchema.parse(input.branding);
    const updated = await getPrisma().event.update({ where: { id: event.id }, data: { brandingJson: asInputJson(branding) } });
    await audit.record({ organizationId: event.organizationId, eventId: event.id, actorUserId: input.actorUserId, action: "EVENT_BRANDING_UPDATED", targetType: "Event", targetId: event.id, before: event.brandingJson, after: branding });
    return updated;
  }

  async addTeam(input: { eventId: string; machineKey: string; name: string; abbreviation?: string; colorToken?: string; logoAssetId?: string; teamCode?: string; actorUserId: string }) {
    const event = await getPrisma().event.findUniqueOrThrow({ where: { id: input.eventId } });
    const team = await getPrisma().$transaction(async (tx) => {
      const created = await tx.team.create({
        data: {
          eventId: input.eventId,
          machineKey: input.machineKey,
          name: input.name,
          abbreviation: input.abbreviation,
          colorToken: input.colorToken,
          logoAssetId: input.logoAssetId,
          accessCodeHash: input.teamCode ? await hashSecret(input.teamCode, 4) : undefined,
        },
      });
      await tx.participationEntry.create({ data: { eventId: input.eventId, teamId: created.id, kind: "TEAM" } });
      return created;
    });
    await audit.record({ organizationId: event.organizationId, eventId: event.id, actorUserId: input.actorUserId, action: "TEAM_CREATED", targetType: "Team", targetId: team.id, after: team });
    return team;
  }

  async updateTeam(input: { eventId: string; teamId: string; name: string; abbreviation?: string; colorToken?: string; logoAssetId?: string; teamCode?: string; actorUserId: string }) {
    const before = await getPrisma().team.findUniqueOrThrow({ where: { id: input.teamId }, include: { event: true } });
    if (before.eventId !== input.eventId) throw new Error("Team belongs to another event");
    const team = await getPrisma().team.update({
      where: { id: input.teamId },
      data: {
        name: input.name,
        abbreviation: input.abbreviation || null,
        colorToken: input.colorToken || null,
        logoAssetId: input.logoAssetId || null,
        ...(input.teamCode ? { accessCodeHash: await hashSecret(input.teamCode, 4) } : {}),
      },
    });
    await audit.record({ organizationId: before.event.organizationId, eventId: input.eventId, actorUserId: input.actorUserId, action: "TEAM_UPDATED", targetType: "Team", targetId: team.id, before, after: team });
    return team;
  }

  async archiveTeam(input: { eventId: string; teamId: string; actorUserId: string }) {
    const before = await getPrisma().team.findUniqueOrThrow({ where: { id: input.teamId }, include: { event: true } });
    if (before.eventId !== input.eventId) throw new Error("Team belongs to another event");
    const team = await getPrisma().$transaction(async (tx) => {
      const archived = await tx.team.update({ where: { id: input.teamId }, data: { status: "ARCHIVED" } });
      await tx.teamMembership.updateMany({ where: { teamId: input.teamId, status: "ACTIVE" }, data: { status: "INACTIVE", leftAt: new Date() } });
      return archived;
    });
    await audit.record({ organizationId: before.event.organizationId, eventId: input.eventId, actorUserId: input.actorUserId, action: "TEAM_ARCHIVED", targetType: "Team", targetId: team.id, before, after: team });
    return team;
  }
}
