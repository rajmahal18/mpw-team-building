import { getPrisma } from "@/lib/prisma";
import { AuditService } from "./audit-service";

const audit = new AuditService();

export class RosterService {
  async addParticipant(input: { eventId: string; displayName: string; externalKey?: string; teamId?: string; roleKey?: string; actorUserId: string }) {
    const event = await getPrisma().event.findUniqueOrThrow({ where: { id: input.eventId } });
    if (input.teamId) {
      const team = await getPrisma().team.findUniqueOrThrow({ where: { id: input.teamId } });
      if (team.eventId !== event.id) throw new Error("Team belongs to another event");
    }
    const result = await getPrisma().$transaction(async (tx) => {
      let person = input.externalKey ? await tx.person.findUnique({ where: { organizationId_externalKey: { organizationId: event.organizationId, externalKey: input.externalKey } } }) : null;
      if (!person) person = await tx.person.create({ data: { organizationId: event.organizationId, displayName: input.displayName, externalKey: input.externalKey || undefined } });
      const participant = await tx.eventParticipant.upsert({
        where: { eventId_personId: { eventId: event.id, personId: person.id } },
        update: { status: "ACTIVE" },
        create: { eventId: event.id, personId: person.id, status: "ACTIVE" },
      });
      if (input.teamId) {
        await tx.teamMembership.upsert({
          where: { teamId_eventParticipantId: { teamId: input.teamId, eventParticipantId: participant.id } },
          update: { status: "ACTIVE", roleKey: input.roleKey },
          create: { teamId: input.teamId, eventParticipantId: participant.id, roleKey: input.roleKey },
        });
      }
      return { person, participant };
    });
    await audit.record({ organizationId: event.organizationId, eventId: event.id, actorUserId: input.actorUserId, action: "PARTICIPANT_ADDED", targetType: "EventParticipant", targetId: result.participant.id, after: { displayName: input.displayName, teamId: input.teamId } });
    return result;
  }

  async assignTeam(input: { eventId: string; eventParticipantId: string; teamId?: string; roleKey?: string; actorUserId: string }) {
    const participant = await getPrisma().eventParticipant.findUniqueOrThrow({ where: { id: input.eventParticipantId }, include: { event: true } });
    if (participant.eventId !== input.eventId) throw new Error("Participant belongs to another event");
    if (input.teamId) {
      const team = await getPrisma().team.findUniqueOrThrow({ where: { id: input.teamId } });
      if (team.eventId !== input.eventId) throw new Error("Team belongs to another event");
    }
    await getPrisma().$transaction(async (tx) => {
      await tx.teamMembership.updateMany({ where: { eventParticipantId: participant.id, status: "ACTIVE" }, data: { status: "INACTIVE", leftAt: new Date() } });
      if (input.teamId) {
        await tx.teamMembership.upsert({
          where: { teamId_eventParticipantId: { teamId: input.teamId, eventParticipantId: participant.id } },
          update: { status: "ACTIVE", leftAt: null, roleKey: input.roleKey },
          create: { teamId: input.teamId, eventParticipantId: participant.id, roleKey: input.roleKey },
        });
      }
    });
    await audit.record({ organizationId: participant.event.organizationId, eventId: input.eventId, actorUserId: input.actorUserId, action: "PARTICIPANT_TEAM_ASSIGNED", targetType: "EventParticipant", targetId: participant.id, after: { teamId: input.teamId ?? null, roleKey: input.roleKey ?? null } });
  }
}
