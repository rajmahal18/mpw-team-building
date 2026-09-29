import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getPrisma } from "@/lib/prisma";
import { verifySecret } from "./password";
import { isParticipantJoinableEventState } from "@/server/security/participant-access";

const cookieName = (eventId: string) => {
  const suffix = createHash("sha256").update(eventId).digest("hex").slice(0, 20);
  return `${process.env.NODE_ENV === "production" ? "__Host-" : ""}mpw_tb_p_${suffix}`;
};
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createTeamParticipantSession(eventId: string, teamId: string, teamCode: string) {
  const event = await getPrisma().event.findUnique({ where: { id: eventId }, select: { state: true } });
  if (!event || !isParticipantJoinableEventState(event.state)) throw new Error("Event is not accepting participant sessions");
  const team = await getPrisma().team.findFirst({ where: { id: teamId, eventId, status: "ACTIVE" } });
  if (!team?.accessCodeHash || !(await verifySecret(teamCode, team.accessCodeHash))) throw new Error("Invalid team code");
  const token = randomBytes(32).toString("base64url");
  const configuredHours = Number(process.env.PARTICIPANT_SESSION_HOURS ?? "24");
  const sessionHours = Number.isFinite(configuredHours) && configuredHours > 0 ? Math.min(configuredHours, 24 * 30) : 24;
  const expiresAt = new Date(Date.now() + sessionHours * 60 * 60 * 1000);
  await getPrisma().participantSession.create({ data: { eventId, teamId, tokenHash: hashToken(token), expiresAt, label: "Shared team session" } });
  const jar = await cookies();
  jar.set(cookieName(eventId), token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: expiresAt });
}

export async function getParticipantSession(eventId: string) {
  const jar = await cookies();
  const name = cookieName(eventId);
  const token = jar.get(name)?.value;
  if (!token) return null;
  const tokenHash = hashToken(token);
  const session = await getPrisma().participantSession.findFirst({ where: { eventId, tokenHash }, include: { team: true } });
  if (!session || session.expiresAt <= new Date() || (session.teamId && session.team?.status !== "ACTIVE")) {
    if (session?.expiresAt && session.expiresAt <= new Date()) await getPrisma().participantSession.delete({ where: { id: session.id } }).catch(() => undefined);
    jar.delete(name);
    return null;
  }
  if (Date.now() - session.lastSeenAt.getTime() > 5 * 60 * 1000) await getPrisma().participantSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  return session;
}
