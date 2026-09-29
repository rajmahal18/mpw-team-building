import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword, hashSecret } from "../src/server/auth/password";
import { DEFAULT_EVENT_CONFIG } from "../src/schemas/event";
import { createStarterDefinition } from "../src/domain/activity/starter-definition";
import { RECOMMENDED_ACTIVITY_LIBRARY } from "../src/domain/activity/library-presets";
import { createHash } from "node:crypto";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for seed");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const checksum = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@mpw.local").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password || password === "replace-me-before-seeding") throw new Error("Set a real SEED_ADMIN_PASSWORD before running the seed.");

  const organization = await prisma.organization.upsert({
    where: { slug: "mpw" },
    update: {},
    create: { name: "Ministry of Public Works", slug: "mpw" },
  });

  const admin = await prisma.userAccount.upsert({
    where: { email },
    update: { name: process.env.SEED_ADMIN_NAME || "MPW Organizer", platformCapabilities: ["events.create", "security.manage", "privacy.manage", "backup.manage"] },
    create: { email, name: process.env.SEED_ADMIN_NAME || "MPW Organizer", passwordHash: await hashPassword(password), platformCapabilities: ["events.create", "security.manage", "privacy.manage", "backup.manage"] },
  });

  const privacyContent = "This event platform processes participant identity, team assignment, activity responses, scores, operational records, and optional media for the declared purpose of administering the event. Retention, access, and disclosure are subject to the agency-approved privacy policy and records schedule.";
  const existingNotice = await prisma.privacyNotice.findFirst({ where: { organizationId: organization.id, publishedAt: { not: null }, retiredAt: null }, orderBy: { version: "desc" } });
  const privacyNotice = existingNotice ?? await prisma.privacyNotice.create({ data: { organizationId: organization.id, version: 1, title: "MPW Team Building Platform Privacy Notice", content: privacyContent, checksum: checksum({ title: "MPW Team Building Platform Privacy Notice", content: privacyContent }), effectiveAt: new Date(), publishedAt: new Date(), createdById: admin.id } });

  const event = await prisma.event.upsert({
    where: { slug: "phase3-sandbox", organizationId: organization.id },
    update: { privacyNoticeId: privacyNotice.id },
    create: {
      organizationId: organization.id,
      name: "MPW Team Building — Phase 3 Sandbox",
      slug: "phase3-sandbox",
      timezone: "Asia/Manila",
      state: "CONFIGURING",
      configJson: DEFAULT_EVENT_CONFIG,
      privacyNoticeId: privacyNotice.id,
    },
  });

  const ownerRole = await prisma.eventRole.upsert({
    where: { eventId_machineKey: { eventId: event.id, machineKey: "event_owner" } },
    update: { capabilities: ["event.read","event.configure","event.publish","event.lock","event.start_pause_resume","event.finalize","teams.read","teams.manage","roster.manage","activities.read","activities.manage","answer_keys.view","stations.manage","stations.operate","routes.manage","announcements.manage","competitions.manage","matches.officiate","submissions.review","results.enter","results.finalize","scores.adjust","scores.override","audit.view","reports.export","roles.manage"] },
    create: {
      eventId: event.id,
      name: "Event Owner",
      machineKey: "event_owner",
      capabilities: ["event.read","event.configure","event.publish","event.lock","event.start_pause_resume","event.finalize","teams.read","teams.manage","roster.manage","activities.read","activities.manage","answer_keys.view","stations.manage","stations.operate","routes.manage","announcements.manage","competitions.manage","matches.officiate","submissions.review","results.enter","results.finalize","scores.adjust","scores.override","audit.view","reports.export","roles.manage"],
    },
  });
  await prisma.eventRoleAssignment.upsert({
    where: { eventRoleId_userAccountId: { eventRoleId: ownerRole.id, userAccountId: admin.id } },
    update: {},
    create: { eventRoleId: ownerRole.id, userAccountId: admin.id },
  });

  // Demo data only. These names/counts are NOT engine assumptions.
  for (const [machineKey, name, code] of [["alpha","Team Alpha","ALPHA1"],["bravo","Team Bravo","BRAVO1"]] as const) {
    const team = await prisma.team.upsert({
      where: { eventId_machineKey: { eventId: event.id, machineKey } },
      update: {},
      create: { eventId: event.id, machineKey, name, accessCodeHash: await hashSecret(code, 4) },
    });
    const entry = await prisma.participationEntry.findFirst({ where: { eventId: event.id, teamId: team.id, kind: "TEAM" } });
    if (!entry) await prisma.participationEntry.create({ data: { eventId: event.id, teamId: team.id, kind: "TEAM" } });
  }

  // Organization-level starter activity library. These are reusable data templates, not engine branches.
  for (const preset of RECOMMENDED_ACTIVITY_LIBRARY) {
    let template = await prisma.activityTemplate.upsert({
      where: { organizationId_machineKey: { organizationId: organization.id, machineKey: preset.machineKey } },
      update: { name: preset.name, description: preset.description, categoryKey: preset.categoryKey, tags: preset.tags, isSystem: true, status: "ACTIVE" },
      create: { organizationId: organization.id, machineKey: preset.machineKey, name: preset.name, description: preset.description, categoryKey: preset.categoryKey, tags: preset.tags, isSystem: true, createdById: admin.id },
    });
    const digest = checksum(preset.definition);
    let templateVersion = await prisma.activityTemplateVersion.findFirst({ where: { templateId: template.id, checksum: digest } });
    if (!templateVersion) {
      const latest = await prisma.activityTemplateVersion.aggregate({ where: { templateId: template.id }, _max: { version: true } });
      await prisma.activityTemplateVersion.updateMany({ where: { templateId: template.id, state: "PUBLISHED" }, data: { state: "SUPERSEDED" } });
      templateVersion = await prisma.activityTemplateVersion.create({ data: { templateId: template.id, version: (latest._max.version ?? 0) + 1, state: "PUBLISHED", schemaVersion: preset.definition.schemaVersion, definitionJson: preset.definition, checksum: digest, publishedAt: new Date(), createdById: admin.id } });
    }
    if (template.currentVersionId !== templateVersion.id) template = await prisma.activityTemplate.update({ where: { id: template.id }, data: { currentVersionId: templateVersion.id } });
  }

  const activity = await prisma.activityInstance.upsert({
    where: { eventId_machineKey: { eventId: event.id, machineKey: "generic-timed-task" } },
    update: {},
    create: { eventId: event.id, machineKey: "generic-timed-task", title: "Generic Timed Task" },
  });

  const existing = await prisma.activityDefinitionVersion.findFirst({ where: { activityInstanceId: activity.id, state: "PUBLISHED" } });
  if (!existing) {
    const definition = {
      ...createStarterDefinition("generic-timed-task", "Generic Timed Task"),
      metrics: [{ key: "elapsed_ms", label: { default: "Elapsed time" }, type: "DURATION_MS", unit: "ms", direction: "LOWER_BETTER", source: "ORGANIZER" }],
      timing: { mode: "STOPWATCH", startTrigger: "MARSHAL", authority: "SERVER" },
      scoring: {
        outputKey: "activity_points",
        outputLabel: "Activity points",
        expression: { type: "clamp", min: 0, max: 100, value: { type: "subtract", left: { type: "constant", value: 100 }, right: { type: "divide", numerator: { type: "metric", key: "elapsed_ms" }, denominator: { type: "constant", value: 1000 }, onZero: 0 } } },
        rounding: { decimals: 2 },
        countsTowardEvent: true,
      },
    };
    const version = await prisma.activityDefinitionVersion.create({
      data: { activityInstanceId: activity.id, version: 1, state: "PUBLISHED", schemaVersion: 1, definitionJson: definition, checksum: checksum(definition), publishedAt: new Date(), createdById: admin.id },
    });
    await prisma.activityInstance.update({ where: { id: activity.id }, data: { currentVersionId: version.id } });
  }

  console.log(`Seeded organizer ${email}`);
  console.log("Seed completed.");
}

main().finally(async () => prisma.$disconnect());
