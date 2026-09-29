"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { requireEventCapability } from "@/server/permissions/capabilities";
import { EventService } from "@/server/services/event-service";
import { ActivityDefinitionService } from "@/server/services/activity-definition-service";
import { ActivityRunService } from "@/server/services/activity-run-service";
import { MetricService } from "@/server/services/metric-service";
import { ScoringService } from "@/server/services/scoring-service";
import { SubmissionService } from "@/server/services/submission-service";
import { StationService } from "@/server/services/station-service";
import { EventLifecycleService } from "@/server/services/event-lifecycle-service";
import type { EventState, StationState } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { createStarterDefinition } from "@/domain/activity/starter-definition";

async function userOrLogin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function addTeam(formData: FormData) {
  const user = await userOrLogin();
  const eventId = String(formData.get("eventId"));
  await requireEventCapability(user.id, eventId, "teams.manage");
  await new EventService().addTeam({
    eventId,
    machineKey: String(formData.get("machineKey")).trim(),
    name: String(formData.get("name")).trim(),
    colorToken: String(formData.get("colorToken") || "").trim() || undefined,
    teamCode: String(formData.get("teamCode") || "").trim() || undefined,
    actorUserId: user.id,
  });
  revalidatePath(`/admin/events/${eventId}`);
}

export async function addActivity(formData: FormData) {
  const user = await userOrLogin();
  const eventId = String(formData.get("eventId"));
  await requireEventCapability(user.id, eventId, "activities.manage");
  const key = String(formData.get("machineKey")).trim();
  const title = String(formData.get("title")).trim();
  const service = new ActivityDefinitionService();
  const activity = await service.createActivity({ eventId, machineKey: key, title, actorUserId: user.id });
  await service.saveDraft({ activityInstanceId: activity.id, definition: createStarterDefinition(key, title), actorUserId: user.id });
  revalidatePath(`/admin/events/${eventId}`);
}

export async function saveDefinition(formData: FormData) {
  const user = await userOrLogin();
  const eventId = String(formData.get("eventId"));
  await requireEventCapability(user.id, eventId, "activities.manage");
  const activityInstanceId = String(formData.get("activityInstanceId"));
  const activity = await getPrisma().activityInstance.findUniqueOrThrow({ where: { id: activityInstanceId }, select: { eventId: true } });
  if (activity.eventId !== eventId) throw new Error("Activity belongs to another event");
  const definition = JSON.parse(String(formData.get("definitionJson")));
  await new ActivityDefinitionService().saveDraft({ activityInstanceId, definition, actorUserId: user.id });
  revalidatePath(`/admin/events/${eventId}`);
}

export async function publishVersion(formData: FormData) {
  const user = await userOrLogin();
  const eventId = String(formData.get("eventId"));
  await requireEventCapability(user.id, eventId, "event.publish");
  const versionId = String(formData.get("versionId"));
  const version = await getPrisma().activityDefinitionVersion.findUniqueOrThrow({ where: { id: versionId }, include: { activityInstance: { select: { eventId: true } } } });
  if (version.activityInstance.eventId !== eventId) throw new Error("Activity version belongs to another event");
  await new ActivityDefinitionService().publish({ versionId, actorUserId: user.id });
  revalidatePath(`/admin/events/${eventId}`);
}

export async function startTeamRun(formData: FormData) {
  const user = await userOrLogin();
  const eventId = String(formData.get("eventId"));
  await requireEventCapability(user.id, eventId, "results.enter");
  const service = new ActivityRunService();
  const entry = await service.ensureTeamEntry(eventId, String(formData.get("teamId")));
  await service.start({ activityInstanceId: String(formData.get("activityInstanceId")), participationEntryId: entry.id });
  revalidatePath(`/admin/events/${eventId}`);
}

export async function recordMetricAndScore(formData: FormData) {
  const user = await userOrLogin();
  const eventId = String(formData.get("eventId"));
  await requireEventCapability(user.id, eventId, "results.enter");
  const runId = String(formData.get("runId"));
  const metricKey = String(formData.get("metricKey"));
  const raw = String(formData.get("value"));
  const value = Number(raw);
  await new MetricService().record({ activityRunId: runId, metricKey, value: Number.isFinite(value) ? value : raw, source: "ORGANIZER", recordedById: user.id });
  await new ScoringService().scoreRun(runId);
  revalidatePath(`/admin/events/${eventId}`);
}

export async function submitGenericBlock(formData: FormData) {
  const user = await userOrLogin();
  const eventId = String(formData.get("eventId"));
  await requireEventCapability(user.id, eventId, "results.enter");
  const runId = String(formData.get("runId"));
  const blockId = String(formData.get("blockId"));
  const payload = JSON.parse(String(formData.get("payloadJson")));
  const idempotencyKey = String(formData.get("idempotencyKey") || `${runId}:${blockId}:manual`);
  await new SubmissionService().submit({ activityRunId: runId, blockId, payload, idempotencyKey });
  revalidatePath(`/admin/events/${eventId}`);
}

export async function addStation(formData: FormData) {
  const user = await userOrLogin();
  const eventId = String(formData.get("eventId"));
  await requireEventCapability(user.id, eventId, "stations.manage");
  const rawCapacity = String(formData.get("capacity") || "");
  await new StationService().create({ eventId, machineKey: String(formData.get("machineKey")).trim(), name: String(formData.get("name")).trim(), capacity: rawCapacity ? Number(rawCapacity) : undefined });
  revalidatePath(`/admin/events/${eventId}`);
}

export async function changeStationState(formData: FormData) {
  const user = await userOrLogin();
  const eventId = String(formData.get("eventId"));
  await requireEventCapability(user.id, eventId, "stations.operate");
  await new StationService().setState(String(formData.get("stationId")), String(formData.get("to")) as StationState);
  revalidatePath(`/admin/events/${eventId}`);
}

export async function transitionEvent(formData: FormData) {
  const user = await userOrLogin();
  const eventId = String(formData.get("eventId"));
  await requireEventCapability(user.id, eventId, "event.start_pause_resume");
  await new EventLifecycleService().transition({ eventId, to: String(formData.get("to")) as EventState, actorUserId: user.id });
  revalidatePath(`/admin/events/${eventId}`);
}
