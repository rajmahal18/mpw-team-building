# Scoring & Results Model

## 1. Core separation

```text
RAW PERFORMANCE -> DERIVED SCORE -> PLACEMENT -> EVENT CONTRIBUTION
```

Never collapse these into one mutable `score` field.

## 2. Raw metrics

Examples:

| Activity | Metric | Raw value | Direction |
|---|---|---:|---|
| Sack race | elapsed_ms | 73,420 | lower better |
| Water transfer | volume_ml | 850 | higher better |
| Quiz | correct_count | 12 | higher better |
| Tower build | height_cm | 145 | higher better |
| Blindfold course | violations | 2 | lower better |
| Marshal task | passed | true | pass/fail |

## 3. Scoring expression AST

```ts
type ScoreExpr =
  | { type: "constant"; value: number }
  | { type: "metric"; key: string }
  | { type: "add"; values: ScoreExpr[] }
  | { type: "subtract"; left: ScoreExpr; right: ScoreExpr }
  | { type: "multiply"; values: ScoreExpr[] }
  | { type: "divide"; numerator: ScoreExpr; denominator: ScoreExpr; onZero: number }
  | { type: "min"; values: ScoreExpr[] }
  | { type: "max"; values: ScoreExpr[] }
  | { type: "clamp"; value: ScoreExpr; min?: number; max?: number }
  | { type: "round"; value: ScoreExpr; decimals: number }
  | { type: "if"; condition: ConditionExpr; then: ScoreExpr; else: ScoreExpr }
  | { type: "band_lookup"; value: ScoreExpr; bands: ScoreBand[] }
  | { type: "placement_lookup"; table: PlacementPointRule[] }
  | { type: "judge_aggregate"; rubricKey: string; mode: JudgeAggregateMode }
  | { type: "attempt_aggregate"; mode: "BEST" | "LATEST" | "SUM" | "AVERAGE"; value: ScoreExpr };
```

No arbitrary code string.

## 4. Score definition

```ts
type ScoringDefinition = {
  outputKey: string;
  outputLabel: string;
  expression: ScoreExpr;
  floor?: number;
  cap?: number;
  rounding?: { decimals: number };
  countsTowardEvent?: boolean;
};
```

An activity may emit multiple score dimensions if needed, but one can be marked the default competitive score.

## 5. Placement points

Arbitrary ordered rules:

```ts
[
  { rankFrom: 1, rankTo: 1, points: 100 },
  { rankFrom: 2, rankTo: 2, points: 85 },
  { rankFrom: 3, rankTo: 3, points: 75 },
  { rankFrom: 4, rankTo: 6, points: 60 },
  { status: "DNF", points: 0 }
]
```

The platform does not know or care whether there are 3, 8, or 20 teams.

## 6. Score ledger

`ScoreEntry` should be append-oriented:

```text
DERIVED        +80  generated from placement rule
BONUS          +10  teamwork bonus
PENALTY        -5   late arrival
OVERRIDE_DELTA +15  organizer correction
------------------------------------------
EFFECTIVE      100
```

Each row stores:

- event/activity/run/entry scope;
- dimension/key;
- amount;
- entry type;
- provenance (formula, rule, manual);
- reason;
- actor for manual entries;
- related evidence/submission;
- createdAt;
- reversal link if reversed.

Never overwrite a prior adjustment without retaining lineage.

## 7. Manual override approaches

Preferred approach:

- retain computed score;
- create an explicit override/delta record;
- optionally create `supersedesScoreEntryId`;
- reason required;
- audit actor/time/before/after.

For a corrected raw metric, preserve old metric as superseded/void and append corrected observation.

## 8. Judge rubrics

```ts
type RubricDefinition = {
  key: string;
  criteria: Array<{
    id: string;
    label: string;
    weight: number;
    scale: {
      min: number;
      max: number;
      step?: number;
      descriptors?: Array<{ value: number; label: string }>;
    };
  }>;
  aggregateJudges: "AVERAGE" | "MEDIAN" | "SUM" | "DROP_HIGH_LOW_AVERAGE";
};
```

No fixed number of criteria or judges.

## 9. Rankings

A ranking definition includes:

- score/metric reference;
- direction;
- eligible status filter;
- tie policy;
- ordered tie-breakers;
- whether ties share rank;
- whether next rank skips after tie;
- DNF/DQ handling.

## 10. Tie-breaker chain

```ts
type TieBreaker =
  | { type: "METRIC"; key: string; direction: "ASC" | "DESC" }
  | { type: "SCORE"; key: string; direction: "ASC" | "DESC" }
  | { type: "HEAD_TO_HEAD" }
  | { type: "FEWER_PENALTIES" }
  | { type: "EARLIER_COMPLETION" }
  | { type: "SUDDEN_DEATH_ACTIVITY"; activityId: string }
  | { type: "DECLARE_TIE" };
```

## 11. Overall event aggregation

Examples representable by config:

- sum every activity contribution;
- weighted category totals;
- best 5 of 7 activities;
- drop lowest score;
- require completion of all core activities;
- bonus activities do not count toward denominator;
- penalties apply globally after activity totals.

## 12. Finalization

Result states:

- `PENDING`
- `PROVISIONAL`
- `DISPUTED`
- `FINAL`
- `VOID`

Finalization freezes the competitive interpretation for reporting, but authorized corrections still create an audited new result revision rather than deleting history.
