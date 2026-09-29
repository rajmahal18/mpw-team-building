import { describe, expect, it } from "vitest";
import { createRoundRobinMatches } from "@/engine/competitions/round-robin";

describe("round-robin competition primitive", () => {
  it.each(["tug-of-war", "head-to-head-quiz"])("is activity-name agnostic for %s", () => {
    const matches = createRoundRobinMatches([{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }]);
    expect(matches).toHaveLength(6);
    expect(new Set(matches.flatMap(m => [m.homeEntryId, m.awayEntryId]))).toEqual(new Set(["a", "b", "c", "d"]));
  });

  it("handles odd entrant counts without fake matches", () => {
    const matches = createRoundRobinMatches([{ id: "a" }, { id: "b" }, { id: "c" }]);
    expect(matches).toHaveLength(3);
    expect(JSON.stringify(matches)).not.toContain("__BYE__");
  });
});
