import { describe, expect, it } from "vitest";
import { rankNumericValues } from "@/engine/scoring/rank-values";
import { pointsForRank } from "@/engine/scoring/placement-points";
import { aggregateJudgeScores, normalizeJudgeRubric } from "@/engine/scoring/rubric";
import { buildLiveStandings } from "@/engine/scoring/aggregate-ledger";
import { createSingleEliminationFirstRound, createNextEliminationRound } from "@/engine/competitions/single-elimination";
import { buildRoundRobinStandings } from "@/engine/competitions/round-robin-standings";
import type { LeaderboardDefinition } from "@/schemas/results";

describe("Phase 7 generic ranking and placement", () => {
  it("ranks both lower-is-better time and higher-is-better quantity without activity names", () => {
    const time = rankNumericValues([{ id: "a", value: 50 }, { id: "b", value: 42 }, { id: "c", value: 42 }], { direction: "ASC" });
    expect(time.map((x)=>[x.id,x.rank])).toEqual([["b",1],["c",1],["a",3]]);
    const quantity = rankNumericValues([{ id: "a", value: 850 }, { id: "b", value: 910 }], { direction: "DESC" });
    expect(quantity[0]).toMatchObject({ id: "b", rank: 1 });
  });

  it("maps arbitrary rank bands to points", () => {
    const rules = [{ rankFrom: 1, rankTo: 1, points: 100 }, { rankFrom: 2, rankTo: 4, points: 75 }, { rankFrom: 5, rankTo: 99, points: 40 }];
    expect(pointsForRank(1, rules)).toBe(100);
    expect(pointsForRank(3, rules)).toBe(75);
    expect(pointsForRank(12, rules)).toBe(40);
  });
});

describe("judge aggregation", () => {
  const criteria = [
    { id: "a", weight: 2, scale: { min: 1, max: 5 } },
    { id: "b", weight: 1, scale: { min: 0, max: 10 } },
  ];
  it("normalizes different criterion scales before weighting", () => {
    expect(normalizeJudgeRubric(criteria, { scores: { a: 5, b: 10 } })).toBe(100);
    expect(normalizeJudgeRubric(criteria, { scores: { a: 1, b: 0 } })).toBe(0);
  });
  it("supports median and drop-high-low for unrelated judged activities", () => {
    expect(aggregateJudgeScores([40, 70, 100], "MEDIAN")).toBe(70);
    expect(aggregateJudgeScores([10, 50, 70, 100], "DROP_HIGH_LOW_AVERAGE")).toBe(60);
  });
});

describe("event leaderboard aggregation", () => {
  const definition: LeaderboardDefinition = {
    schemaVersion: 1,
    eligibleKinds: ["TEAM"],
    primaryDirection: "DESC",
    rankStyle: "COMPETITION",
    visibility: "LIVE",
    tieBreakers: [{ type: "FEWER_PENALTIES" }],
    sources: [
      { id: "core", label: "Core", dimensionKey: "activity_points", scope: "ACTIVITY", activityInstanceIds: ["a1","a2","a3"], weight: 1, valueDirection: "DESC", attemptMode: "BEST", selection: { mode: "BEST_N", count: 2 } },
      { id: "adjust", label: "Adjustments", dimensionKey: "event_points", scope: "EVENT", weight: 1, valueDirection: "DESC", attemptMode: "SUM", selection: { mode: "ALL" } },
    ],
  };
  const runs = [
    { id:"r1",participationEntryId:"e1",activityInstanceId:"a1",attemptNo:1,completedAt:new Date("2026-01-01"),createdAt:new Date("2026-01-01") },
    { id:"r2",participationEntryId:"e1",activityInstanceId:"a1",attemptNo:2,completedAt:new Date("2026-01-02"),createdAt:new Date("2026-01-02") },
    { id:"r3",participationEntryId:"e1",activityInstanceId:"a2",attemptNo:1,completedAt:new Date("2026-01-03"),createdAt:new Date("2026-01-03") },
    { id:"r4",participationEntryId:"e1",activityInstanceId:"a3",attemptNo:1,completedAt:new Date("2026-01-04"),createdAt:new Date("2026-01-04") },
    { id:"r5",participationEntryId:"e2",activityInstanceId:"a1",attemptNo:1,completedAt:new Date("2026-01-01"),createdAt:new Date("2026-01-01") },
    { id:"r6",participationEntryId:"e2",activityInstanceId:"a2",attemptNo:1,completedAt:new Date("2026-01-02"),createdAt:new Date("2026-01-02") },
  ];
  const ledger = [
    {participationEntryId:"e1",activityInstanceId:"a1",activityRunId:"r1",dimensionKey:"activity_points",amount:40,entryType:"DERIVED"},
    {participationEntryId:"e1",activityInstanceId:"a1",activityRunId:"r2",dimensionKey:"activity_points",amount:80,entryType:"DERIVED"},
    {participationEntryId:"e1",activityInstanceId:"a2",activityRunId:"r3",dimensionKey:"activity_points",amount:70,entryType:"DERIVED"},
    {participationEntryId:"e1",activityInstanceId:"a3",activityRunId:"r4",dimensionKey:"activity_points",amount:20,entryType:"DERIVED"},
    {participationEntryId:"e1",activityInstanceId:null,activityRunId:null,dimensionKey:"event_points",amount:-5,entryType:"PENALTY"},
    {participationEntryId:"e2",activityInstanceId:"a1",activityRunId:"r5",dimensionKey:"activity_points",amount:75,entryType:"DERIVED"},
    {participationEntryId:"e2",activityInstanceId:"a2",activityRunId:"r6",dimensionKey:"activity_points",amount:75,entryType:"DERIVED"},
  ];
  it("supports best attempts, best-N activities, and event-scoped adjustments", () => {
    const standings=buildLiveStandings({definition,entries:[{id:"e1",label:"One",kind:"TEAM"},{id:"e2",label:"Two",kind:"TEAM"}],ledger,runs});
    expect(standings.find((x)=>x.entryId==="e1")?.componentTotals).toEqual({core:150,adjust:-5});
    expect(standings[0]).toMatchObject({entryId:"e2",total:150,rank:1});
    expect(standings[1]).toMatchObject({entryId:"e1",total:145,penaltyTotal:5,rank:2});
  });
});

describe("competition plugins", () => {
  it("builds power-of-two single-elimination progression with generic byes", () => {
    const first=createSingleEliminationFirstRound(["a","b","c","d","e"].map((id,index)=>({id,seed:index+1})));
    expect(first).toHaveLength(4);
    expect(first.filter((m)=>m.state==="BYE")).toHaveLength(3);
    const winners=first.map((m)=>m.entryIds[0]);
    expect(createNextEliminationRound(winners,2)).toHaveLength(2);
  });
  it("derives round-robin standings from generic match results", () => {
    const standings=buildRoundRobinStandings(["a","b","c"],[
      {sideEntryIds:["a","b"],result:{winnerEntryId:"a",sideScores:[{entryId:"a",score:11},{entryId:"b",score:2}]}},
      {sideEntryIds:["a","c"],result:{winnerEntryId:null,sideScores:[{entryId:"a",score:10},{entryId:"c",score:10}]}},
      {sideEntryIds:["b","c"],result:{winnerEntryId:"c",sideScores:[{entryId:"b",score:4},{entryId:"c",score:11}]}},
    ],{winPoints:3,drawPoints:1,lossPoints:0,allowDraws:true});
    expect(standings[0]).toMatchObject({entryId:"a",points:4,rank:1});
    expect(standings[1]).toMatchObject({entryId:"c",points:4,rank:2});
  });
});
