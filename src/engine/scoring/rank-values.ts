export type RankDirection = "ASC" | "DESC";
export type RankStyle = "COMPETITION" | "DENSE";

export type RankedValue<T> = T & { value: number; rank: number };

function nearlyEqual(a: number, b: number, tolerance: number) {
  return Math.abs(a - b) <= tolerance;
}

export function rankNumericValues<T extends { value: number }>(
  items: T[],
  options: { direction: RankDirection; style?: RankStyle; tieTolerance?: number },
): RankedValue<T>[] {
  const direction = options.direction;
  const style = options.style ?? "COMPETITION";
  const tolerance = options.tieTolerance ?? 0;
  const sorted = [...items].sort((a, b) => direction === "DESC" ? b.value - a.value : a.value - b.value);
  let previousValue: number | undefined;
  let previousRank = 0;
  let denseRank = 0;
  return sorted.map((item, index) => {
    const tied = previousValue !== undefined && nearlyEqual(item.value, previousValue, tolerance);
    let rank: number;
    if (tied) rank = previousRank;
    else if (style === "DENSE") rank = ++denseRank;
    else rank = index + 1;
    previousValue = item.value;
    previousRank = rank;
    return { ...item, rank };
  });
}
