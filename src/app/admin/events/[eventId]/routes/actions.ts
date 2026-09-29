"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { requireEventCapability } from "@/server/permissions/capabilities";
import { RouteService } from "@/server/services/route-service";
import { RouteStepConfigSchema } from "@/schemas/flow";
import { getPrisma } from "@/lib/prisma";

async function userOrLogin() { const user = await getCurrentUser(); if (!user) redirect("/login"); return user; }
const pathFor = (eventId: string) => `/admin/events/${eventId}/routes`;
async function assertRoute(eventId: string, routePlanId: string) { const route = await getPrisma().routePlan.findUniqueOrThrow({ where: { id: routePlanId } }); if (route.eventId !== eventId) throw new Error("Route belongs to another event"); return route; }

export async function createRoute(formData: FormData) {
  const user = await userOrLogin(); const eventId = String(formData.get("eventId"));
  await requireEventCapability(user.id, eventId, "routes.manage");
  await new RouteService().create({ eventId, machineKey: String(formData.get("machineKey")).trim(), name: String(formData.get("name")).trim(), mode: String(formData.get("mode")), actorUserId: user.id });
  revalidatePath(pathFor(eventId));
}

export async function addRouteStep(formData: FormData) {
  const user = await userOrLogin(); const eventId = String(formData.get("eventId")); const routePlanId = String(formData.get("routePlanId"));
  await requireEventCapability(user.id, eventId, "routes.manage"); await assertRoute(eventId, routePlanId);
  const route = await getPrisma().routePlan.findUniqueOrThrow({ where: { id: routePlanId }, include: { steps: { orderBy: { sequence: "asc" } } } });
  const stationId = String(formData.get("stationId") || "") || undefined;
  const activityInstanceId = String(formData.get("activityInstanceId") || "") || undefined;
  const steps = route.steps.map((step) => ({ stationId: step.stationId ?? undefined, activityInstanceId: step.activityInstanceId ?? undefined, config: step.configJson ?? {} }));
  steps.push({ stationId, activityInstanceId, config: RouteStepConfigSchema.parse({}) });
  await new RouteService().replaceSteps(route.id, steps); revalidatePath(pathFor(eventId));
}

export async function removeRouteStep(formData: FormData) {
  const user = await userOrLogin(); const eventId = String(formData.get("eventId")); const routePlanId = String(formData.get("routePlanId")); const routeStepId = String(formData.get("routeStepId"));
  await requireEventCapability(user.id, eventId, "routes.manage"); await assertRoute(eventId, routePlanId);
  const route = await getPrisma().routePlan.findUniqueOrThrow({ where: { id: routePlanId }, include: { steps: { orderBy: { sequence: "asc" } } } });
  await new RouteService().replaceSteps(route.id, route.steps.filter((step)=>step.id !== routeStepId).map((step)=>({ stationId: step.stationId ?? undefined, activityInstanceId: step.activityInstanceId ?? undefined, config: step.configJson ?? {} })));
  revalidatePath(pathFor(eventId));
}

export async function moveRouteStep(formData: FormData) {
  const user = await userOrLogin(); const eventId = String(formData.get("eventId")); const routePlanId = String(formData.get("routePlanId")); const routeStepId = String(formData.get("routeStepId")); const direction = String(formData.get("direction"));
  await requireEventCapability(user.id, eventId, "routes.manage"); await assertRoute(eventId, routePlanId);
  const route = await getPrisma().routePlan.findUniqueOrThrow({ where: { id: routePlanId }, include: { steps: { orderBy: { sequence: "asc" } } } });
  const steps = [...route.steps]; const index = steps.findIndex((step)=>step.id === routeStepId); const target = direction === "UP" ? index - 1 : index + 1;
  if (index >= 0 && target >= 0 && target < steps.length) [steps[index], steps[target]] = [steps[target], steps[index]];
  await new RouteService().replaceSteps(route.id, steps.map((step)=>({ stationId: step.stationId ?? undefined, activityInstanceId: step.activityInstanceId ?? undefined, config: step.configJson ?? {} })));
  revalidatePath(pathFor(eventId));
}

export async function updateRouteStepSettings(formData: FormData) {
  const user = await userOrLogin(); const eventId = String(formData.get("eventId")); const routePlanId = String(formData.get("routePlanId")); const routeStepId = String(formData.get("routeStepId"));
  await requireEventCapability(user.id, eventId, "routes.manage"); await assertRoute(eventId, routePlanId);
  const route = await getPrisma().routePlan.findUniqueOrThrow({ where: { id: routePlanId }, include: { steps: { orderBy: { sequence: "asc" } } } });
  const requirementType = String(formData.get("requirementType") || "NONE"); const requirementValue = String(formData.get("requirementValue") || "").trim();
  const requirements: any[] = [];
  if (requirementType === "PREVIOUS_COMPLETED") requirements.push({ type: "PREVIOUS_COMPLETED" });
  if (requirementType === "STATION_COMPLETED" && requirementValue) requirements.push({ type: "STATION_COMPLETED", stationId: requirementValue });
  if (requirementType === "STEP_COMPLETED" && requirementValue) requirements.push({ type: "STEP_COMPLETED", routeStepId: requirementValue });
  if (requirementType === "MIN_COMPLETED" && requirementValue) requirements.push({ type: "MIN_COMPLETED", count: Number(requirementValue) });
  if (requirementType === "MANUAL") requirements.push({ type: "MANUAL", key: requirementValue || "manual" });
  const nextConfig = RouteStepConfigSchema.parse({ optional: formData.get("optional") === "on", participantVisibility: String(formData.get("participantVisibility") || "WHEN_UNLOCKED"), unlockMode: String(formData.get("unlockMode") || "DEFAULT"), requirementMatch: String(formData.get("requirementMatch") || "ALL"), unlockRequirements: requirements, notes: String(formData.get("notes") || "").trim() || undefined });
  await new RouteService().replaceSteps(route.id, route.steps.map((step)=>({ stationId: step.stationId ?? undefined, activityInstanceId: step.activityInstanceId ?? undefined, config: step.id === routeStepId ? nextConfig : step.configJson ?? {} })));
  revalidatePath(pathFor(eventId));
}

export async function assignRouteTeams(formData: FormData) {
  const user = await userOrLogin(); const eventId = String(formData.get("eventId")); const routePlanId = String(formData.get("routePlanId"));
  await requireEventCapability(user.id, eventId, "routes.manage"); await assertRoute(eventId, routePlanId);
  let teamIds = formData.getAll("teamId").map(String).filter(Boolean);
  if (teamIds.length === 0 || formData.get("allTeams") === "on") teamIds = (await getPrisma().team.findMany({ where: { eventId, status: "ACTIVE" }, select: { id: true } })).map((team)=>team.id);
  await new RouteService().assignTeams({ routePlanId, teamIds, actorUserId: user.id });
  revalidatePath(pathFor(eventId)); revalidatePath(`/admin/events/${eventId}/control`);
}

export async function setRouteUnlockOverride(formData: FormData) {
  const user = await userOrLogin(); const eventId = String(formData.get("eventId"));
  await requireEventCapability(user.id, eventId, "routes.manage");
  await new RouteService().setUnlockOverride({ eventId, teamId: String(formData.get("teamId")), routeStepId: String(formData.get("routeStepId")), unlocked: String(formData.get("unlocked")) === "true", reason: String(formData.get("reason") || "").trim(), actorUserId: user.id });
  revalidatePath(pathFor(eventId)); revalidatePath(`/admin/events/${eventId}/control`);
}
