# Phase 7 Architecture

## Competitive data flow

```text
Submission / Marshal / Judge / Timer
              ↓
      MetricObservation(s)
              ↓
        scoring AST
              ↓
      DERIVED ScoreEntry
              ↓
(optional activity placement conversion)
              ↓
     PLACEMENT ScoreEntry
              ↓
 bonus / penalty / override ledger rows
              ↓
 Leaderboard source aggregation
              ↓
        tie-break chain
              ↓
       LIVE standings
              ↓
 PROVISIONAL / FINAL immutable snapshot
```

The arrows are transformations. They are not destructive updates.

## Why the score ledger is append-oriented

A government event may need to explain why a score changed. The platform therefore preserves the original computed award and appends a correction/reversal rather than rewriting history.

This permits:

- reproducible reports;
- dispute review;
- actor/reason audit;
- rescoring after corrected raw measurements;
- changed placement interpretation without destroying performance evidence.

## Leaderboard definition vs snapshot

`LeaderboardDefinition` describes how current ledger data should be interpreted.

`LeaderboardSnapshot` freezes one interpretation at one revision.

Editing the definition later changes the live view, but never mutates an already-created snapshot.

## Attempt handling

Multiple ActivityRuns for the same entry/activity do not automatically sum. Each leaderboard source and placement operation explicitly chooses:

- BEST;
- LATEST;
- SUM;
- AVERAGE.

For BEST selection, the configured source direction determines whether a lower or higher value is better.

## Competition plugin contract

Competition format logic creates/advances generic matches. It never branches on activity title.

```text
Competition(formatKey, configJson)
      ↓ plugin
Match(round, sequence)
      ↓
MatchSide(participationEntry)
      ↓
MatchResult
      ↓
format-specific progression/standings
```

The current registry-equivalent implementations are round robin and single elimination. A future double-elimination, Swiss or group-to-knockout format should add another reusable format engine rather than modifying a named game.
