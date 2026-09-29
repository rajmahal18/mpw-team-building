import { EventConfigSchema } from "@/schemas/event";
import { ActivityDefinitionSchema } from "@/schemas/activity";

export type EventPreflightInput = {
  eventConfig: unknown;
  activities: unknown[];
  teamCount: number;
};

export class EventPreflightService {
  check(input: EventPreflightInput) {
    const issues: Array<{ level: "ERROR" | "WARNING"; code: string; message: string }> = [];
    const event = EventConfigSchema.safeParse(input.eventConfig);
    if (!event.success) issues.push({ level: "ERROR", code: "EVENT_CONFIG_INVALID", message: event.error.message });
    if (input.teamCount === 0) issues.push({ level: "WARNING", code: "NO_TEAMS", message: "Event has no teams yet." });
    input.activities.forEach((activity, index) => {
      const parsed = ActivityDefinitionSchema.safeParse(activity);
      if (!parsed.success) issues.push({ level: "ERROR", code: "ACTIVITY_INVALID", message: `Activity ${index + 1}: ${parsed.error.message}` });
    });
    return { ok: !issues.some((issue) => issue.level === "ERROR"), issues };
  }
}
