"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { EventBrandingConfigSchema, EventConfigSchema } from "@/schemas/event";
import { MachineKeySchema } from "@/schemas/shared";
import { getCurrentUser } from "@/server/auth/session";
import { requireEventCapability } from "@/server/permissions/capabilities";
import { EventService } from "@/server/services/event-service";
import { zonedLocalToUtc } from "@/lib/timezone";

async function userOrLogin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const optional = (form: FormData, key: string) => text(form, key) || undefined;
const checked = (form: FormData, key: string) => form.get(key) === "on";

type SaveState = { status: "idle" | "success" | "error"; message: string; revision: number };

export async function updateEventSettings(previousState: SaveState, formData: FormData): Promise<SaveState> {
  const user = await userOrLogin();
  const eventId = text(formData, "eventId");
  await requireEventCapability(user.id, eventId, "event.configure");

  try {
    const timezone = text(formData, "timezone") || "Asia/Manila";
    const topOnlyRaw = text(formData, "topOnly");
    const retentionRaw = text(formData, "retentionDays");
    const name = text(formData, "name");
    if (!name) throw new Error("Event name is required");

    // Parse the whole screen before writing so the single Save button is all-or-nothing.
    const config = EventConfigSchema.parse({
      schemaVersion: 1,
      terminology: {
        team: text(formData, "termTeam"), participant: text(formData, "termParticipant"), station: text(formData, "termStation"), marshal: text(formData, "termMarshal"), points: text(formData, "termPoints"),
      },
      participation: { accountRequirement: text(formData, "accountRequirement"), deviceMode: text(formData, "deviceMode"), allowLateJoin: checked(formData, "allowLateJoin") },
      leaderboard: { enabled: checked(formData, "leaderboardEnabled"), visibility: text(formData, "leaderboardVisibility"), mode: text(formData, "leaderboardMode"), ...(topOnlyRaw ? { topOnly: Number(topOnlyRaw) } : {}), hideExactScores: checked(formData, "hideExactScores") },
      privacy: { eventVisibility: text(formData, "eventVisibility"), participantNameVisibility: text(formData, "participantNameVisibility"), mediaVisibility: text(formData, "mediaVisibility"), ...(retentionRaw ? { retentionDays: Number(retentionRaw) } : {}) },
      timing: { enforceSchedule: checked(formData, "enforceSchedule"), allowEarlyCheckInMinutes: Number(text(formData, "allowEarlyCheckInMinutes") || 0), allowLateJoin: checked(formData, "timingAllowLateJoin") },
      featureFlags: {},
    });
    const themeTokens = Object.fromEntries([
      ["accent", optional(formData, "accent")], ["background", optional(formData, "background")], ["surface", optional(formData, "surface")], ["text", optional(formData, "text")],
    ].filter((entry): entry is [string, string] => Boolean(entry[1])));
    const branding = EventBrandingConfigSchema.parse({
      logoAssetId: optional(formData, "logoAssetId"), coverAssetId: optional(formData, "coverAssetId"), teamColorUsage: text(formData, "teamColorUsage") || undefined, ...(Object.keys(themeTokens).length ? { themeTokens } : {}),
    });

    await new EventService().updateSetup({
      eventId,
      name,
      shortName: optional(formData, "shortName"),
      slug: MachineKeySchema.parse(text(formData, "slug")),
      timezone,
      startsAt: zonedLocalToUtc(text(formData, "startsAt"), timezone),
      endsAt: zonedLocalToUtc(text(formData, "endsAt"), timezone),
      config,
      branding,
      actorUserId: user.id,
    });
    revalidatePath(`/admin/events/${eventId}`);
    revalidatePath(`/admin/events/${eventId}/setup`);
    return { status: "success", message: "All event settings are saved.", revision: previousState.revision + 1 };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save event settings.";
    return { status: "error", message, revision: previousState.revision + 1 };
  }
}
