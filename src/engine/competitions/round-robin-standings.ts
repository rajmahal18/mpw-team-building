import type { MatchResult, RoundRobinConfig } from "@/schemas/results";

export type RoundRobinResolvedMatch = { sideEntryIds: string[]; result: MatchResult };
export type RoundRobinStanding = { entryId: string; played: number; wins: number; draws: number; losses: number; points: number; scoreFor: number; scoreAgainst: number; scoreDiff: number; rank: number };

export function buildRoundRobinStandings(entryIds: string[], matches: RoundRobinResolvedMatch[], config: RoundRobinConfig): RoundRobinStanding[] {
  const map = new Map(entryIds.map((entryId) => [entryId, { entryId, played: 0, wins: 0, draws: 0, losses: 0, points: 0, scoreFor: 0, scoreAgainst: 0, scoreDiff: 0, rank: 0 }]));
  for (const match of matches) {
    if (match.sideEntryIds.length !== 2) continue;
    const [aId, bId] = match.sideEntryIds;
    const a = map.get(aId), b = map.get(bId); if (!a || !b) continue;
    a.played += 1; b.played += 1;
    const scores = new Map(match.result.sideScores.map((side) => [side.entryId, side.score]));
    const aScore = scores.get(aId), bScore = scores.get(bId);
    if (typeof aScore === "number" && typeof bScore === "number") {
      a.scoreFor += aScore; a.scoreAgainst += bScore; b.scoreFor += bScore; b.scoreAgainst += aScore;
    }
    if (!match.result.winnerEntryId) {
      a.draws += 1; b.draws += 1; a.points += config.drawPoints; b.points += config.drawPoints;
    } else if (match.result.winnerEntryId === aId) {
      a.wins += 1; b.losses += 1; a.points += config.winPoints; b.points += config.lossPoints;
    } else if (match.result.winnerEntryId === bId) {
      b.wins += 1; a.losses += 1; b.points += config.winPoints; a.points += config.lossPoints;
    }
  }
  for (const item of map.values()) item.scoreDiff = item.scoreFor - item.scoreAgainst;
  const sorted = [...map.values()].sort((a,b)=>b.points-a.points || b.wins-a.wins || b.scoreDiff-a.scoreDiff || b.scoreFor-a.scoreFor || a.entryId.localeCompare(b.entryId));
  let previous: RoundRobinStanding | undefined;
  return sorted.map((item,index)=>{
    const tied = previous && previous.points===item.points && previous.wins===item.wins && previous.scoreDiff===item.scoreDiff && previous.scoreFor===item.scoreFor;
    const rank = tied ? previous!.rank : index+1;
    const result = { ...item, rank }; previous = result; return result;
  });
}
