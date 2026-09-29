import type { RouteMode, RouteProgressStep, RouteStepConfig, RouteUnlockRequirement } from "@/schemas/flow";

export type UnlockContext = {
  mode: RouteMode;
  stepIndex: number;
  orderedSteps: Array<{ routeStepId: string; stationId?: string }>;
  completedStepIds: Set<string>;
  skippedStepIds: Set<string>;
  completedStationIds: Set<string>;
  manualUnlockStepIds: Set<string>;
};

function requirementPasses(requirement: RouteUnlockRequirement, ctx: UnlockContext): boolean {
  const completed = (id: string) => ctx.completedStepIds.has(id) || ctx.skippedStepIds.has(id);
  switch (requirement.type) {
    case "PREVIOUS_COMPLETED": {
      if (ctx.stepIndex === 0) return true;
      return completed(ctx.orderedSteps[ctx.stepIndex - 1]?.routeStepId ?? "");
    }
    case "STEP_COMPLETED": return completed(requirement.routeStepId);
    case "STATION_COMPLETED": return ctx.completedStationIds.has(requirement.stationId);
    case "MIN_COMPLETED": return ctx.completedStepIds.size + ctx.skippedStepIds.size >= requirement.count;
    case "MANUAL": return ctx.manualUnlockStepIds.has(ctx.orderedSteps[ctx.stepIndex]?.routeStepId ?? "");
  }
  return false;
}

export function isRouteStepUnlocked(config: RouteStepConfig, ctx: UnlockContext): boolean {
  const stepId = ctx.orderedSteps[ctx.stepIndex]?.routeStepId;
  if (!stepId) return false;
  if (ctx.manualUnlockStepIds.has(stepId)) return true;
  if (config.unlockMode === "ALWAYS") return true;
  if (config.unlockMode === "REQUIREMENTS") {
    if (config.unlockRequirements.length === 0) return true;
    const checks = config.unlockRequirements.map((rule) => requirementPasses(rule, ctx));
    return config.requirementMatch === "ANY" ? checks.some(Boolean) : checks.every(Boolean);
  }
  if (ctx.mode === "FREE") return true;
  if (ctx.stepIndex === 0) return true;
  return requirementPasses({ type: "PREVIOUS_COMPLETED" }, ctx);
}

export function participantStepVisible(config: RouteStepConfig, state: { unlocked: boolean; completed: boolean; skipped: boolean }): boolean {
  if (config.participantVisibility === "ALWAYS") return true;
  if (config.participantVisibility === "AFTER_COMPLETED") return state.completed || state.skipped;
  return state.unlocked || state.completed || state.skipped;
}
