import { getPrisma } from "@/lib/prisma";

export const CAPABILITIES = [
  "event.read", "event.configure", "event.publish", "event.lock", "event.start_pause_resume", "event.finalize",
  "teams.read", "teams.manage", "roster.manage", "activities.read", "activities.manage", "answer_keys.view",
  "stations.manage", "stations.operate", "routes.manage", "announcements.manage", "competitions.manage", "matches.officiate",
  "submissions.review", "results.enter", "results.finalize", "scores.adjust", "scores.override", "audit.view", "reports.export", "roles.manage",
] as const;

export type Capability = typeof CAPABILITIES[number];
export type PlatformCapability = "events.create" | "security.manage" | "privacy.manage" | "backup.manage";

export async function hasPlatformCapability(userAccountId: string, capability: PlatformCapability) {
  const user = await getPrisma().userAccount.findUnique({ where: { id: userAccountId }, select: { platformCapabilities: true } });
  return Boolean(user?.platformCapabilities.includes(capability));
}

export async function requirePlatformCapability(userAccountId: string, capability: PlatformCapability) {
  if (!(await hasPlatformCapability(userAccountId, capability))) throw new Error(`Missing platform capability: ${capability}`);
}

export async function hasEventCapability(userAccountId: string, eventId: string, capability: Capability): Promise<boolean> {
  const assignments = await getPrisma().eventRoleAssignment.findMany({ where: { userAccountId, role: { eventId } }, include: { role: true } });
  return assignments.some((assignment) => assignment.role.capabilities.includes(capability));
}

export async function requireEventCapability(userAccountId: string, eventId: string, capability: Capability) {
  if (!(await hasEventCapability(userAccountId, eventId, capability))) throw new Error(`Missing capability: ${capability}`);
  const event = await getPrisma().event.findUnique({ where: { id: eventId }, select: { archivedAt: true } });
  if (!event || event.archivedAt) throw new Error("Event is no longer available");
}
