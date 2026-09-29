export type SeededEntrant = { id: string; seed?: number };
export type EliminationMatchDraft = { round: number; sequence: number; entryIds: string[]; state: "SCHEDULED" | "BYE" };

function nextPowerOfTwo(value: number) {
  let power = 1;
  while (power < value) power *= 2;
  return power;
}

export function createSingleEliminationFirstRound(entrants: SeededEntrant[]): EliminationMatchDraft[] {
  if (entrants.length < 2) return [];
  const ordered = [...entrants].sort((a, b) => (a.seed ?? Number.MAX_SAFE_INTEGER) - (b.seed ?? Number.MAX_SAFE_INTEGER));
  const bracketSize = nextPowerOfTwo(ordered.length);
  const byeCount = bracketSize - ordered.length;
  const drafts: EliminationMatchDraft[] = [];
  let sequence = 1;
  for (let i = 0; i < byeCount; i += 1) drafts.push({ round: 1, sequence: sequence++, entryIds: [ordered[i].id], state: "BYE" });
  for (let i = byeCount; i < ordered.length; i += 2) {
    const pair = ordered.slice(i, i + 2).map((entrant) => entrant.id);
    drafts.push({ round: 1, sequence: sequence++, entryIds: pair, state: pair.length === 1 ? "BYE" : "SCHEDULED" });
  }
  return drafts;
}

export function createNextEliminationRound(winnerEntryIds: string[], round: number): EliminationMatchDraft[] {
  if (winnerEntryIds.length < 2) return [];
  const drafts: EliminationMatchDraft[] = [];
  for (let i = 0; i < winnerEntryIds.length; i += 2) {
    const pair = winnerEntryIds.slice(i, i + 2);
    drafts.push({ round, sequence: drafts.length + 1, entryIds: pair, state: pair.length === 1 ? "BYE" : "SCHEDULED" });
  }
  return drafts;
}
