"use server";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { createTeamParticipantSession } from "@/server/auth/participant-session";
import { RateLimitExceededError, RateLimitService } from "@/server/services/rate-limit-service";
import { serverActionFingerprint } from "@/server/security/request-security";
import { isParticipantJoinableEventState } from "@/server/security/participant-access";

export async function joinTeam(formData: FormData) {
  const eventId = String(formData.get("eventId"));
  const slug = String(formData.get("slug"));
  const teamId = String(formData.get("teamId"));
  const teamCode = String(formData.get("teamCode"));
  const requestedReturnTo = String(formData.get("returnTo") || "");
  const returnTo = requestedReturnTo.startsWith(`/e/${slug}/`) ? requestedReturnTo : `/e/${slug}`;
  const fingerprint = await serverActionFingerprint();
  try {
    await new RateLimitService().consume({ scope: "teamJoin", subject: `team:${teamId}|ip:${fingerprint}` });
    await new RateLimitService().consume({ scope: "teamJoin", subject: `ip:${fingerprint}` });
  } catch (error) {
    if (error instanceof RateLimitExceededError) redirect(`/e/${slug}/join?error=rate`);
    throw error;
  }
  const event = await getPrisma().event.findFirst({ where: { id: eventId, slug }, select: { id: true, state: true } });
  if (!event || !isParticipantJoinableEventState(event.state)) redirect(`/e/${slug}/join?error=event`);
  const team = await getPrisma().team.findFirst({ where: { id: teamId, eventId: event.id, status: "ACTIVE" } });
  if (!team) redirect(`/e/${slug}/join?error=team`);
  try {
    await createTeamParticipantSession(eventId, teamId, teamCode);
  } catch {
    redirect(`/e/${slug}/join?error=code`);
  }
  redirect(returnTo);
}
