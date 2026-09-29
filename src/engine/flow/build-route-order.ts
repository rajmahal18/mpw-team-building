import { deterministicShuffle } from "@/engine/randomization/deterministic";
import type { RouteMode } from "@/schemas/flow";

type Step = { routeStepId: string; sequence: number };

export function buildRouteOrder<T extends Step>(steps: readonly T[], mode: RouteMode, options?: { teamIndex?: number; seed?: string }): T[] {
  const base = [...steps].sort((a, b) => a.sequence - b.sequence);
  if (mode === "RANDOMIZED") return deterministicShuffle(base, options?.seed ?? "route");
  if (mode === "CIRCULAR" && base.length > 0) {
    const offset = Math.abs(options?.teamIndex ?? 0) % base.length;
    return [...base.slice(offset), ...base.slice(0, offset)];
  }
  return base;
}
