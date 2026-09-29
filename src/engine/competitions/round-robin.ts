export type CompetitionEntrant = { id: string; label?: string };
export type MatchDraft = { round: number; homeEntryId: string; awayEntryId: string };

export function createRoundRobinMatches(entrants: CompetitionEntrant[]): MatchDraft[] {
  if (entrants.length < 2) return [];
  const ids = entrants.map((entrant) => entrant.id);
  const bye = "__BYE__";
  if (ids.length % 2 === 1) ids.push(bye);

  const rounds = ids.length - 1;
  const half = ids.length / 2;
  const rotation = [...ids];
  const matches: MatchDraft[] = [];

  for (let round = 0; round < rounds; round += 1) {
    for (let i = 0; i < half; i += 1) {
      const home = rotation[i];
      const away = rotation[rotation.length - 1 - i];
      if (home !== bye && away !== bye) matches.push({ round: round + 1, homeEntryId: home, awayEntryId: away });
    }
    const fixed = rotation[0];
    const rest = rotation.slice(1);
    rest.unshift(rest.pop()!);
    rotation.splice(0, rotation.length, fixed, ...rest);
  }
  return matches;
}
