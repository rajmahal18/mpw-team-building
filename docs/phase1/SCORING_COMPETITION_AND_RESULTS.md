# Scoring, Competition, and Results Engine

## Principle

Do not model “winner” as one fixed formula. Activities produce metrics/results; scoring rules interpret them.

## 1. Raw result vs score

Always separate:

- **raw result**: e.g. 73.4 seconds, 850 mL, 12 correct, judge ratings;
- **derived score**: e.g. 100 points;
- **placement**: e.g. 2nd;
- **event contribution**: e.g. 80 championship points.

This preserves transparency and allows rescoring without losing original performance data.

## 2. Scoring strategies

- fixed completion points;
- binary pass/fail;
- correct-answer total;
- partial credit;
- negative marking;
- speed-decay points;
- threshold bands;
- rank/placement table;
- normalized score;
- best result;
- average result;
- sum of rounds;
- weighted categories;
- judge rubric;
- multiple judges;
- opponent result;
- manual points;
- bonus/demerit;
- hybrid formulas.

## 3. Placement scoring

Never hardcode 1st=100, 2nd=80, 3rd=60.

Represent arbitrary mappings:

```text
1 -> 100
2 -> 85
3 -> 75
4 -> 65
5+ -> 50
DNF -> 0
```

or formulas/ranges.

## 4. Tie breakers

Configurable ordered list:

- fewer penalties;
- faster total time;
- higher specified activity score;
- more activity wins;
- earliest completion;
- head-to-head result;
- judge score;
- sudden-death activity;
- declared tie.

## 5. Penalties and bonuses

Each adjustment must store:

- type;
- amount;
- score/time dimension;
- reason;
- related activity/match;
- actor;
- timestamp;
- optional evidence;
- reversible status.

## 6. Judge scoring

Rubrics may have arbitrary criteria:

```text
Creativity      40%
Teamwork        30%
Execution       20%
Presentation    10%
```

Support:

- arbitrary criteria;
- arbitrary scales;
- weights;
- multiple judges;
- average/median;
- optional drop-high/drop-low later;
- comments;
- judge lock/finalize.

## 7. Head-to-head competition

Generic `Match` model:

- competition/activity;
- participants/sides;
- round;
- scheduled time;
- station/court/field;
- result;
- winner;
- score/sets/metrics as generic structured result;
- officials;
- status;
- notes;
- audit.

## 8. Tournament formats

Engine/plugin candidates:

- round robin;
- single elimination;
- double elimination;
- group/pool stage;
- group-to-knockout;
- best-of-N series;
- manual bracket;
- seeded/random draw;
- byes;
- third-place match;
- consolation round.

Do not bind these to any one sport.

## 9. Overall event championship

An event can combine heterogeneous activities:

- Quiz: 30 correct -> 90 event points
- Sack race: 2nd -> 80 event points
- Creative video: judges -> 92 event points

The overall leaderboard uses event-level aggregation rules.

Support:

- sum;
- weighted sum;
- best N activities;
- category weights;
- drop-lowest;
- mandatory activity completion;
- penalty deductions;
- bonus activities.

## 10. Provisional vs final

Scores/results should clearly support:

- pending verification;
- provisional;
- disputed;
- final;
- void.

Leaderboard can choose whether pending results count.

## 11. Manual override

Manual overrides are necessary in live events but must be explicit:

- reason required above configured threshold/sensitivity;
- show original vs overridden value;
- log actor/time;
- allow reversal;
- optionally require second admin approval for final results later.

## 12. Result archive

After event:

- final standings;
- per-activity rankings;
- raw metrics;
- score breakdown;
- penalties/bonuses;
- match history;
- media/submissions subject to privacy;
- awards;
- audit/export.

