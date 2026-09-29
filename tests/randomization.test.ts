import { describe, expect, it } from "vitest";
import { deterministicShuffle } from "@/engine/randomization/deterministic";

describe("deterministic randomization", () => {
  it("replays exactly with the same seed", () => {
    const input = [1,2,3,4,5,6,7,8];
    expect(deterministicShuffle(input, "event:activity:round1")).toEqual(deterministicShuffle(input, "event:activity:round1"));
  });
});
