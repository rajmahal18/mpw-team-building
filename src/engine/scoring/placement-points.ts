import type { PlacementPointRule } from "@/schemas/results";

export function pointsForRank(rank: number, rules: PlacementPointRule[]): number {
  const rule = rules.find((candidate) => rank >= candidate.rankFrom && rank <= candidate.rankTo);
  return rule?.points ?? 0;
}
