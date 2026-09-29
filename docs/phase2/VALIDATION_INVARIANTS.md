# Validation & Invariants

## 1. Global invariants

- Every event-scoped foreign reference belongs to the same event.
- Published definition versions are immutable.
- Historical rows are not silently deleted when referenced by runtime/audit data.
- Organizer-provided content is sanitized appropriately before rendering.
- Participant APIs never expose protected answer-key configuration.
- Server recalculates authoritative scoring; client scores are advisory only.
- Consequential manual changes produce audit records.

## 2. Activity definition invariants

- Every block ID is unique within a definition version.
- Every metric key is unique within its activity definition.
- Rule references point to valid blocks/metrics/activities/stations for the appropriate scope.
- Completion policy references existing targets.
- Score expressions reference valid numeric/compatible metrics.
- Required verification mode has enough assigned/eligible staff where applicable, or preflight warns/errors.
- Timers cannot use negative durations.
- Attempt limits, selection counts, and thresholds are non-negative and semantically valid.

## 3. Question invariants

- Choice IDs are unique per question version.
- Single-select correctness resolves to exactly one answer when auto-graded.
- Multi-select supports arbitrary choice count and valid correct-set config.
- Selection min/max cannot exceed available choices.
- Fill-blank answer aliases belong to valid blank IDs.
- Random draw count cannot exceed eligible question count unless replacement is explicitly supported.
- Question-version references are immutable after event lock.

## 4. Route invariants

- Fixed route steps have a valid order.
- No missing station/activity references.
- Required prerequisites are satisfiable.
- Direct cycles are rejected unless loop semantics are explicit and bounded.
- Team route assignment is valid for the event.
- Disabled/cancelled stations have an explicit policy: wait, fallback, bypass, or organizer decision.

## 5. Runtime invariants

- An `ActivityRun` references exactly one immutable definition version.
- The acting `ParticipationEntry` is eligible for the event/activity.
- Attempt number is server-derived under the attempt policy.
- Idempotency key uniqueness prevents duplicate critical writes.
- Submitted target exists in the referenced definition/snapshot.
- Result metrics have valid type/unit/value shape.
- Finalized run cannot accept ordinary submissions without explicit correction/override flow.

## 6. Scoring invariants

- Score ledger entries are append-oriented.
- Manual adjustments identify actor and reason when policy requires it.
- Reversed adjustment references the original entry.
- Placement calculation uses a defined eligible population and tie policy.
- Final event standings reference finalized/provisional policy explicitly.
- Arithmetic division defines zero behavior.
- Formula evaluation is deterministic for the same inputs/version.

## 7. Competition invariants

- Match sides are valid entries in the competition.
- A match cannot be finalized without a result allowed by the format.
- Advancement cannot occur twice from the same finalized match under the same format version.
- Byes/walkovers are explicit result states, not fake scores.
- Bracket mutation after live play requires correction/version/audit flow.

## 8. Permission invariants

- Frontend visibility never substitutes for server authorization.
- Staff scopes are enforced (station/activity/team restrictions).
- Participant session cannot mutate another team/entry without staff capability.
- Answer keys require explicit capability.
- Audit/export access requires capability.

## 9. Event-lock preflight

Blocking errors should include:

- no event identity/basic schedule;
- activity definition invalid;
- missing required answer key;
- impossible random draw;
- unresolved route target;
- invalid scoring formula;
- duplicate machine keys within scope;
- required station/activity missing;
- competition has invalid entrant/format config;
- required verification cannot be fulfilled under strict policy;
- broken asset/reference needed to play.

Warnings, not necessarily blockers:

- high-intensity activity without safety notes;
- outdoor activity without contingency;
- station capacity likely to cause congestion;
- team sizes outside template recommendation;
- no alternate participation role for high-mobility task;
- leaderboard visible while scores are largely manual/pending;
- media collection with unclear retention/visibility settings.

## 10. Defensive technical limits

“Flexible” does not mean unbounded resource abuse. The platform may enforce documented technical ceilings for payload size, media size, nesting depth, rule count, choice count, or content length. These must be:

- generous enough for legitimate event use;
- centrally configured/documented;
- not masquerading as business assumptions;
- adjustable without rewriting activity-specific logic.
