# Phase 7 Status — Scoring, Competitions & Leaderboards

## Goal

Support heterogeneous MPW team-building scoring without collapsing raw performance, computed scores, placements and overall event totals into one mutable number.

## Implemented

### Append-only score ledger

`ScoreEntry` remains the competitive accounting source of truth.

Supported ledger entry types now include:

- DERIVED;
- PLACEMENT;
- BONUS;
- PENALTY;
- MANUAL;
- OVERRIDE_DELTA;
- REVERSAL.

Manual corrections require a reason and actor. Reversal appends an opposite row; it does not delete the original history.

### Runtime/system scoring metrics

The scoring runtime can combine organizer-defined MetricObservations with generic system metrics derived from accepted submissions:

- `system_submission_count`;
- `system_graded_count`;
- `system_correct_count`;
- `system_submission_points`;
- `system_possible_points`;
- `system_percent_correct`;
- `system_elapsed_ms` when a stable completion/submission timestamp exists.

Scoring is attempted after accepted submissions/metrics, but an incomplete formula does not invalidate an otherwise valid submission.

### Judge scoring

Judge rubric submissions are normalized across arbitrary criterion scales, weighted, then aggregated using the rubric's configured mode:

- average;
- median;
- sum;
- drop-high-low average.

The resulting rubric value becomes a normal metric and can feed the same scoring expression engine as time, count, volume or any other numeric metric.

### Placement conversion

Any activity can be ranked from either:

- a derived score dimension; or
- a raw numeric metric.

Organizer controls determine:

- ascending or descending direction;
- best/latest/sum/average across attempts;
- tie tolerance;
- arbitrary rank bands;
- arbitrary output score dimension.

Recomputation reverses the previous active placement generation before appending the new generation.

### Event aggregation

Leaderboards are configuration data, not named event code.

A leaderboard may have arbitrary weighted sources. Each source controls:

- score dimension;
- activity-scoped vs event-scoped ledger rows;
- optional activity filter/category composition;
- source weight;
- higher/lower values considered better for attempt/activity selection;
- attempt aggregation: best/latest/sum/average;
- activity selection: all, best N, or drop lowest N.

This can represent examples such as:

- sum all activity points;
- 70% core games + 30% creative games;
- best 5 of 7 activities;
- drop the lowest activity;
- event-level bonuses/penalties layered after activity scores.

### Tie-break chains

Current reusable tie-break primitives:

- source total;
- any score dimension;
- fewer penalties;
- earlier overall completion;
- declare tie.

Rank style supports competition ranking (`1,2,2,4`) and dense ranking (`1,2,2,3`).

### Result revisions

Live standings are computed from the current ledger. Organizers can persist immutable result snapshots as:

- PROVISIONAL;
- FINAL.

Each snapshot stores the standings, configuration/input hash, revision and actor/reason metadata. Later corrections create a new revision instead of rewriting a past final report.

### Competition plugins

Generic competition runtime now has two format engines:

- round robin;
- single elimination.

Both use the same `Competition -> Match -> MatchSide -> ParticipationEntry` model.

Round robin supports arbitrary entrant counts and configurable win/draw/loss points. Standings derive played/win/draw/loss, score for/against/difference and points.

Single elimination supports arbitrary entrant counts by generating generic byes up to the next power-of-two bracket. Winners automatically advance once a round is resolved. Results are idempotent and audited.

A finalized elimination result cannot be casually changed after downstream matches exist, because that would silently invalidate the bracket. Future bracket-reset/void tooling should be an explicit audited operation.

### Organizer surfaces

New event tabs:

- **Scores** — live leaderboards, aggregation sources, tie-breakers, placement rules, bonuses/penalties/overrides, ledger reversal and provisional/final snapshots;
- **Competitions** — create round robin/single-elimination competitions, choose arbitrary teams, record results, view standings/bracket rounds and finalize.

Final brand polish remains deferred.
