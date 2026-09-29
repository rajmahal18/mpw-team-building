import type { AttemptAggregateMode, LeaderboardDefinition, LeaderboardSource, LeaderboardTieBreaker } from "@/schemas/results";

export type LedgerRow = {
  participationEntryId: string;
  activityInstanceId: string | null;
  activityRunId: string | null;
  dimensionKey: string;
  amount: number;
  entryType: string;
  createdAt?: Date;
};

export type RunMeta = { id: string; participationEntryId: string; activityInstanceId: string; attemptNo: number; completedAt: Date | null; createdAt: Date };
export type LeaderboardEntryMeta = { id: string; label: string; kind: string };

export type LiveStanding = {
  entryId: string;
  label: string;
  kind: string;
  rank: number;
  total: number;
  componentTotals: Record<string, number>;
  scoreDimensions: Record<string, number>;
  penaltyTotal: number;
  completedAt: Date | null;
};

function aggregateAttempts(values: Array<{ value: number; attemptNo: number; completedAt: Date | null; createdAt: Date }>, mode: AttemptAggregateMode, direction: "ASC" | "DESC") {
  if (!values.length) return 0;
  if (mode === "SUM") return values.reduce((sum, item) => sum + item.value, 0);
  if (mode === "AVERAGE") return values.reduce((sum, item) => sum + item.value, 0) / values.length;
  if (mode === "BEST") return direction === "DESC" ? Math.max(...values.map((item) => item.value)) : Math.min(...values.map((item) => item.value));
  const latest = [...values].sort((a, b) => b.attemptNo - a.attemptNo || b.createdAt.getTime() - a.createdAt.getTime())[0];
  return latest.value;
}

function selectActivityValues(values: number[], source: LeaderboardSource) {
  if (source.selection.mode === "ALL") return values;
  const bestFirst = [...values].sort((a, b) => source.valueDirection === "DESC" ? b - a : a - b);
  if (source.selection.mode === "BEST_N") return bestFirst.slice(0, source.selection.count);
  const drop = Math.min(source.selection.count, values.length);
  return bestFirst.slice(0, Math.max(0, bestFirst.length - drop));
}

function compareNumber(a: number, b: number, direction: "ASC" | "DESC") { return direction === "DESC" ? b - a : a - b; }
function compareDate(a: Date | null, b: Date | null) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.getTime() - b.getTime();
}

function compareTieBreaker(a: Omit<LiveStanding, "rank">, b: Omit<LiveStanding, "rank">, tie: LeaderboardTieBreaker) {
  if (tie.type === "SOURCE_TOTAL") return compareNumber(a.componentTotals[tie.sourceId] ?? 0, b.componentTotals[tie.sourceId] ?? 0, tie.direction);
  if (tie.type === "SCORE_DIMENSION") return compareNumber(a.scoreDimensions[tie.dimensionKey] ?? 0, b.scoreDimensions[tie.dimensionKey] ?? 0, tie.direction);
  if (tie.type === "FEWER_PENALTIES") return a.penaltyTotal - b.penaltyTotal;
  if (tie.type === "EARLIER_COMPLETION") return compareDate(a.completedAt, b.completedAt);
  return 0;
}

function equalByRanking(a: Omit<LiveStanding, "rank">, b: Omit<LiveStanding, "rank">, definition: LeaderboardDefinition) {
  if (a.total !== b.total) return false;
  for (const tie of definition.tieBreakers) {
    if (tie.type === "DECLARE_TIE") return true;
    if (compareTieBreaker(a, b, tie) !== 0) return false;
  }
  return true;
}

export function buildLiveStandings(input: {
  definition: LeaderboardDefinition;
  entries: LeaderboardEntryMeta[];
  ledger: LedgerRow[];
  runs: RunMeta[];
}): LiveStanding[] {
  const { definition } = input;
  const eligible = input.entries.filter((entry) => definition.eligibleKinds.includes(entry.kind as never));
  const runMap = new Map(input.runs.map((run) => [run.id, run]));

  const standings = eligible.map((entry) => {
    const rows = input.ledger.filter((row) => row.participationEntryId === entry.id);
    const scoreDimensions: Record<string, number> = {};
    for (const row of rows) scoreDimensions[row.dimensionKey] = (scoreDimensions[row.dimensionKey] ?? 0) + row.amount;
    const penaltyTotal = rows.filter((row) => row.entryType === "PENALTY").reduce((sum, row) => sum + Math.abs(row.amount), 0);
    const completedDates = input.runs.filter((run) => run.participationEntryId === entry.id && run.completedAt).map((run) => run.completedAt!).sort((a,b)=>b.getTime()-a.getTime());
    const componentTotals: Record<string, number> = {};

    for (const source of definition.sources) {
      const sourceRows = rows.filter((row) => row.dimensionKey === source.dimensionKey && (source.scope === "EVENT" ? row.activityInstanceId === null : row.activityInstanceId !== null));
      let sourceValue = 0;
      if (source.scope === "EVENT") {
        sourceValue = sourceRows.reduce((sum, row) => sum + row.amount, 0);
      } else {
        const byActivity = new Map<string, typeof sourceRows>();
        for (const row of sourceRows) {
          if (!row.activityInstanceId) continue;
          if (source.activityInstanceIds?.length && !source.activityInstanceIds.includes(row.activityInstanceId)) continue;
          const group = byActivity.get(row.activityInstanceId) ?? [];
          group.push(row); byActivity.set(row.activityInstanceId, group);
        }
        const activityValues: number[] = [];
        for (const activityRows of byActivity.values()) {
          const byRun = new Map<string, number>();
          let noRun = 0;
          for (const row of activityRows) {
            if (row.activityRunId) byRun.set(row.activityRunId, (byRun.get(row.activityRunId) ?? 0) + row.amount);
            else noRun += row.amount;
          }
          const attempts = [...byRun.entries()].map(([runId, value]) => {
            const run = runMap.get(runId);
            return { value, attemptNo: run?.attemptNo ?? 0, completedAt: run?.completedAt ?? null, createdAt: run?.createdAt ?? new Date(0) };
          });
          let activityValue = attempts.length ? aggregateAttempts(attempts, source.attemptMode, source.valueDirection) : 0;
          activityValue += noRun;
          activityValues.push(activityValue);
        }
        sourceValue = selectActivityValues(activityValues, source).reduce((sum, value) => sum + value, 0);
      }
      componentTotals[source.id] = sourceValue * source.weight;
    }
    const total = Object.values(componentTotals).reduce((sum, value) => sum + value, 0);
    return { entryId: entry.id, label: entry.label, kind: entry.kind, total, componentTotals, scoreDimensions, penaltyTotal, completedAt: completedDates[0] ?? null };
  });

  standings.sort((a, b) => {
    const primary = compareNumber(a.total, b.total, definition.primaryDirection);
    if (primary) return primary;
    for (const tie of definition.tieBreakers) {
      if (tie.type === "DECLARE_TIE") return 0;
      const result = compareTieBreaker(a, b, tie);
      if (result) return result;
    }
    return a.label.localeCompare(b.label);
  });

  let denseRank = 0;
  let previous: Omit<LiveStanding, "rank"> | undefined;
  let previousRank = 0;
  return standings.map((standing, index) => {
    const tied = previous ? equalByRanking(previous, standing, definition) : false;
    let rank: number;
    if (tied) rank = previousRank;
    else if (definition.rankStyle === "DENSE") rank = ++denseRank;
    else rank = index + 1;
    previous = standing;
    previousRank = rank;
    return { ...standing, rank };
  });
}
