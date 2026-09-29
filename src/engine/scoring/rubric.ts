export type RubricCriterion = { id: string; weight: number; scale: { min: number; max: number } };
export type JudgeRubricPayload = { scores: Record<string, number> };
export type JudgeAggregateMode = "AVERAGE" | "MEDIAN" | "SUM" | "DROP_HIGH_LOW_AVERAGE";

function mean(values: number[]) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function normalizeJudgeRubric(criteria: RubricCriterion[], payload: JudgeRubricPayload): number {
  const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  if (totalWeight <= 0) throw new Error("Rubric needs positive criterion weights");
  let weighted = 0;
  for (const criterion of criteria) {
    const value = payload.scores[criterion.id];
    if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Missing rubric score: ${criterion.id}`);
    if (value < criterion.scale.min || value > criterion.scale.max) throw new Error(`Rubric score out of range: ${criterion.id}`);
    const normalized = ((value - criterion.scale.min) / (criterion.scale.max - criterion.scale.min)) * 100;
    weighted += normalized * criterion.weight;
  }
  return weighted / totalWeight;
}

export function aggregateJudgeScores(values: number[], mode: JudgeAggregateMode): number {
  if (!values.length) throw new Error("No judge scores to aggregate");
  if (mode === "SUM") return values.reduce((sum, value) => sum + value, 0);
  if (mode === "MEDIAN") return median(values);
  if (mode === "DROP_HIGH_LOW_AVERAGE" && values.length >= 3) {
    const sorted = [...values].sort((a, b) => a - b);
    return mean(sorted.slice(1, -1));
  }
  return mean(values);
}
