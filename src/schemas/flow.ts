import { z } from "zod";

export const RouteModeSchema = z.enum(["FIXED", "FREE", "CIRCULAR", "RANDOMIZED"]);
export type RouteMode = z.infer<typeof RouteModeSchema>;

export const RouteUnlockRequirementSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("PREVIOUS_COMPLETED") }),
  z.object({ type: z.literal("STEP_COMPLETED"), routeStepId: z.string().min(1) }),
  z.object({ type: z.literal("STATION_COMPLETED"), stationId: z.string().min(1) }),
  z.object({ type: z.literal("MIN_COMPLETED"), count: z.number().int().min(0) }),
  z.object({ type: z.literal("MANUAL"), key: z.string().min(1) }),
]);
export type RouteUnlockRequirement = z.infer<typeof RouteUnlockRequirementSchema>;

export const RouteStepConfigSchema = z.object({
  optional: z.boolean().default(false),
  participantVisibility: z.enum(["ALWAYS", "WHEN_UNLOCKED", "AFTER_COMPLETED"]).default("WHEN_UNLOCKED"),
  unlockMode: z.enum(["DEFAULT", "ALWAYS", "REQUIREMENTS"]).default("DEFAULT"),
  requirementMatch: z.enum(["ALL", "ANY"]).default("ALL"),
  unlockRequirements: z.array(RouteUnlockRequirementSchema).default([]),
  notes: z.string().max(2000).optional(),
}).prefault({});
export type RouteStepConfig = z.infer<typeof RouteStepConfigSchema>;

export const StationConfigSchema = z.object({
  locationLabel: z.string().max(300).optional(),
  instructions: z.string().max(4000).optional(),
  participantMessage: z.string().max(2000).optional(),
  queuePolicy: z.enum(["FIFO", "MANUAL"]).default("FIFO"),
  autoCallNext: z.boolean().default(true),
  allowWalkIn: z.boolean().default(false),
  fallbackStationId: z.string().min(1).optional(),
}).prefault({});
export type StationConfig = z.infer<typeof StationConfigSchema>;

export const RouteAssignmentStepSchema = z.object({
  routeStepId: z.string().min(1),
  sequence: z.number().int().positive(),
  stationId: z.string().min(1).optional(),
  activityInstanceId: z.string().min(1).optional(),
  config: RouteStepConfigSchema,
});

export const RouteAssignmentSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  routePlanId: z.string().min(1),
  mode: RouteModeSchema,
  seed: z.string().optional(),
  orderedSteps: z.array(RouteAssignmentStepSchema),
});
export type RouteAssignmentSnapshot = z.infer<typeof RouteAssignmentSnapshotSchema>;

export const RouteProgressStepSchema = RouteAssignmentStepSchema.extend({
  completed: z.boolean(),
  skipped: z.boolean(),
  unlocked: z.boolean(),
  visible: z.boolean(),
});
export type RouteProgressStep = z.infer<typeof RouteProgressStepSchema>;
