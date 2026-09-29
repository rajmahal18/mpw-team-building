import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ActivityBlockSchema } from "@/schemas/activity";
import { EventConfigSchema } from "@/schemas/event";
import { participantProjection } from "@/engine/blocks/registry";
import { isPermanentOutboxStatus } from "@/features/participant/outbox";

describe("Phase 8 field/PWA contracts", () => {
  it("keeps media-submission requirements generic and participant-visible", () => {
    const block = ActivityBlockSchema.parse({ id: "proof", type: "media_submission", prompt: { default: "Upload proof" }, acceptedKinds: ["IMAGE", "VIDEO"], minItems: 1, maxItems: 5, requireMarshalReview: true, required: true });
    const safe = participantProjection(block) as Record<string, unknown>;
    expect(safe.acceptedKinds).toEqual(["IMAGE", "VIDEO"]);
    expect(safe.maxItems).toBe(5);
  });

  it("supports event-level leaderboard and media privacy policies without hardcoded event names", () => {
    const config = EventConfigSchema.parse({ schemaVersion: 1, terminology: {}, participation: {}, leaderboard: { visibility: "PARTICIPANTS", mode: "DELAYED" }, privacy: { mediaVisibility: "EVENT_ONLY" }, timing: {}, featureFlags: {} });
    expect(config.leaderboard.mode).toBe("DELAYED");
    expect(config.privacy.mediaVisibility).toBe("EVENT_ONLY");
  });

  it("treats validation/auth conflicts as durable blocked outbox items while retrying transient failures", () => {
    expect(isPermanentOutboxStatus(400)).toBe(true);
    expect(isPermanentOutboxStatus(401)).toBe(true);
    expect(isPermanentOutboxStatus(409)).toBe(true);
    expect(isPermanentOutboxStatus(408)).toBe(false);
    expect(isPermanentOutboxStatus(429)).toBe(false);
    expect(isPermanentOutboxStatus(503)).toBe(false);
  });

  it("does not cache personalized participant HTML in the service worker", () => {
    const sw = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
    expect(sw).not.toContain("PAGE_CACHE");
    expect(sw).toContain('fetch(request).catch(() => caches.match("/offline"))');
  });
});
