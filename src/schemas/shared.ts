import { z } from "zod";

export const IdSchema = z.string().min(1).max(191);
export const MachineKeySchema = z.string().regex(/^[a-z0-9][a-z0-9_-]*$/).max(100);
export const LocalizedTextSchema = z.object({
  default: z.string().min(1),
  translations: z.record(z.string(), z.string()).optional(),
}).strict();

export const VisibilitySchema = z.enum(["PUBLIC", "EVENT", "STAFF", "PRIVATE"]);
export const CompareOpSchema = z.enum(["EQ", "NE", "GT", "GTE", "LT", "LTE", "IN", "NOT_IN"]);

export const TechnicalLimits = {
  maxBlocksPerActivity: 500,
  maxChoicesPerQuestion: 100,
  maxRulesPerActivity: 250,
  maxConditionDepth: 12,
  maxTextLength: 20_000,
  maxTeamsPerBulkOperation: 500,
} as const;
