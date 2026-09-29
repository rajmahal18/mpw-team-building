import { describe, expect, it } from "vitest";
import { RouteStepConfigSchema, StationConfigSchema } from "@/schemas/flow";

describe("omitted flow configuration", () => {
  it("applies route field defaults when the whole config is missing", () => {
    expect(RouteStepConfigSchema.parse(undefined)).toEqual({
      optional: false, participantVisibility: "WHEN_UNLOCKED", unlockMode: "DEFAULT",
      requirementMatch: "ALL", unlockRequirements: [],
    });
  });
  it("applies station defaults while preserving explicit settings", () => {
    expect(StationConfigSchema.parse(undefined)).toEqual({ queuePolicy: "FIFO", autoCallNext: true, allowWalkIn: false });
    expect(StationConfigSchema.parse({ queuePolicy: "MANUAL", autoCallNext: false })).toEqual({ queuePolicy: "MANUAL", autoCallNext: false, allowWalkIn: false });
  });
});
