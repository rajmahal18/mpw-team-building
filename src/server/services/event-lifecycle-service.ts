import type { EventState } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { AuditService } from "./audit-service";

const transitions: Record<EventState, readonly EventState[]> = {
  DRAFT: ["CONFIGURING", "CANCELLED"],
  CONFIGURING: ["REGISTRATION_OPEN", "READY", "CANCELLED"],
  REGISTRATION_OPEN: ["CONFIGURING", "READY", "CANCELLED"],
  READY: ["CONFIGURING", "LOCKED", "CANCELLED"],
  LOCKED: ["LIVE", "CANCELLED"],
  LIVE: ["PAUSED", "RESULTS_REVIEW", "CANCELLED"],
  PAUSED: ["LIVE", "RESULTS_REVIEW", "CANCELLED"],
  RESULTS_REVIEW: ["FINALIZED"],
  FINALIZED: ["ARCHIVED"],
  ARCHIVED: [],
  CANCELLED: [],
};

export class EventLifecycleService {
  canTransition(from: EventState, to: EventState) { return transitions[from].includes(to); }
  nextStates(from: EventState) { return transitions[from]; }

  async transition(input: { eventId: string; to: EventState; actorUserId: string }) {
    const event = await getPrisma().event.findUniqueOrThrow({ where: { id: input.eventId } });
    if (!this.canTransition(event.state, input.to)) throw new Error(`Invalid event transition ${event.state} -> ${input.to}`);
    const updated = await getPrisma().event.update({ where: { id: input.eventId }, data: { state: input.to } });
    await new AuditService().record({ organizationId: event.organizationId, eventId: event.id, actorUserId: input.actorUserId, action: `EVENT_${input.to}`, targetType: "Event", targetId: event.id, before: { state: event.state }, after: { state: updated.state } });
    return updated;
  }
}
