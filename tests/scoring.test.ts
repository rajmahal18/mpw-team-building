import { describe, expect, it } from "vitest";
import { evaluateScoringDefinition } from "@/engine/scoring/evaluate-score";
import type { ScoringDefinition } from "@/schemas/scoring";

const fasterIsBetter: ScoringDefinition = {
  outputKey: "points",
  outputLabel: "Points",
  expression: {
    type: "clamp", min: 0, max: 100,
    value: { type: "subtract", left: { type: "constant", value: 100 }, right: { type: "divide", numerator: { type: "metric", key: "elapsed_ms" }, denominator: { type: "constant", value: 1000 }, onZero: 0 } },
  },
  countsTowardEvent: true,
};

describe("generic scoring", () => {
  it("uses the same duration metric for unrelated physical activities", () => {
    const sackRace = evaluateScoringDefinition(fasterIsBetter, { metrics: { elapsed_ms: 42_000 } });
    const puzzleCarryRelay = evaluateScoringDefinition(fasterIsBetter, { metrics: { elapsed_ms: 42_000 } });
    expect(sackRace).toBe(58);
    expect(puzzleCarryRelay).toBe(58);
  });

  it("defines zero division behavior", () => {
    const score = evaluateScoringDefinition({ outputKey: "x", outputLabel: "X", expression: { type: "divide", numerator: { type: "constant", value: 10 }, denominator: { type: "constant", value: 0 }, onZero: 7 }, countsTowardEvent: false }, { metrics: {} });
    expect(score).toBe(7);
  });
});
