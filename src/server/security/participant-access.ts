import type { EventState } from "@/generated/prisma/client";

const PARTICIPANT_VISIBLE_STATES = new Set<EventState>([
  "REGISTRATION_OPEN",
  "READY",
  "LOCKED",
  "LIVE",
  "PAUSED",
  "RESULTS_REVIEW",
  "FINALIZED",
]);

const PARTICIPANT_JOIN_STATES = new Set<EventState>([
  "REGISTRATION_OPEN",
  "READY",
  "LOCKED",
  "LIVE",
  "PAUSED",
]);

export function isParticipantVisibleEventState(state: EventState) {
  return PARTICIPANT_VISIBLE_STATES.has(state);
}

export function isParticipantJoinableEventState(state: EventState) {
  return PARTICIPANT_JOIN_STATES.has(state);
}

export function assertParticipantEventInteractive(state: EventState) {
  if (state !== "LIVE") throw new Error(state === "PAUSED" ? "The event is currently paused" : "The event is not live");
}
