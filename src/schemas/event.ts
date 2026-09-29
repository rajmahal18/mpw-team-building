import { z } from "zod";

export const LeaderboardPolicySchema = z.object({
  enabled: z.boolean().default(true),
  visibility: z.enum(["PUBLIC", "PARTICIPANTS", "STAFF_ONLY"]).default("PARTICIPANTS"),
  mode: z.enum(["LIVE", "DELAYED", "FINAL_ONLY"]).default("LIVE"),
  topOnly: z.number().int().positive().optional(),
  hideExactScores: z.boolean().default(false),
}).strict();

export const PrivacyPolicySchema = z.object({
  eventVisibility: z.enum(["PUBLIC", "PRIVATE_LINK", "INVITE_ONLY"]).default("PRIVATE_LINK"),
  participantNameVisibility: z.enum(["PUBLIC", "EVENT_ONLY", "STAFF_ONLY"]).default("EVENT_ONLY"),
  mediaVisibility: z.enum(["PUBLIC", "EVENT_ONLY", "STAFF_ONLY", "DISABLED"]).default("EVENT_ONLY"),
  retentionDays: z.number().int().positive().max(3650).optional(),
}).strict();

export const EventTimingPolicySchema = z.object({
  enforceSchedule: z.boolean().default(false),
  allowEarlyCheckInMinutes: z.number().int().nonnegative().max(1440).default(0),
  allowLateJoin: z.boolean().default(true),
}).strict();

export const EventConfigSchema = z.object({
  schemaVersion: z.literal(1),
  terminology: z.object({
    team: z.string().min(1).default("Team"),
    participant: z.string().min(1).default("Participant"),
    station: z.string().min(1).default("Station"),
    marshal: z.string().min(1).default("Marshal"),
    points: z.string().min(1).default("Points"),
  }).strict(),
  participation: z.object({
    accountRequirement: z.enum(["NONE", "OPTIONAL", "REQUIRED"]).default("OPTIONAL"),
    deviceMode: z.enum(["INDIVIDUAL", "SHARED_TEAM", "EITHER"]).default("EITHER"),
    allowLateJoin: z.boolean().default(true),
  }).strict(),
  leaderboard: LeaderboardPolicySchema,
  privacy: PrivacyPolicySchema,
  timing: EventTimingPolicySchema,
  featureFlags: z.record(z.string(), z.boolean()).default({}),
}).strict();

export const EventBrandingConfigSchema = z.object({
  logoAssetId: z.string().optional(),
  coverAssetId: z.string().optional(),
  teamColorUsage: z.enum(["NONE", "ACCENT", "PROMINENT"]).optional(),
  themeTokens: z.record(z.string(), z.string()).optional(),
}).strict();

export type EventConfig = z.infer<typeof EventConfigSchema>;
export type EventBrandingConfig = z.infer<typeof EventBrandingConfigSchema>;

export const DEFAULT_EVENT_CONFIG: EventConfig = EventConfigSchema.parse({
  schemaVersion: 1,
  terminology: {},
  participation: {},
  leaderboard: {},
  privacy: {},
  timing: {},
  featureFlags: {},
});
