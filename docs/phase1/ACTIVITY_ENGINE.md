# Generic Activity Engine

## Goal

Represent a wide range of digital and physical team-building activities without writing activity-specific application logic.

## Core model

```text
ActivityTemplate
  -> copied into Event as ActivityInstance
     -> contains Blocks
     -> reads/writes Variables and Metrics
     -> governed by Rules
     -> receives Submissions / Result Entries
     -> produces Scores / Outcomes / Progression
```

## 1. ActivityTemplate

Reusable library item containing defaults:

- metadata;
- tags;
- recommended group size;
- setup/materials;
- suggested blocks;
- suggested scoring;
- suggested safety/accessibility notes;
- default verification;
- estimated duration;
- optional variants.

Templates must be clonable and fully editable per event.

## 2. ActivityInstance

Event-specific copy of a template or a blank custom activity.

Must never depend on its template after creation except for explicit “sync/update from template” functionality if added later.

## 3. Blocks

Blocks are generic pieces of an activity flow.

### Content blocks

- heading;
- rich text/instructions;
- image;
- video;
- audio;
- file/link/reference;
- clue;
- hint;
- safety notice;
- equipment checklist;
- organizer-only note;
- marshal-only note.

### Input blocks

- single select;
- multi-select;
- boolean;
- text;
- textarea;
- fill blank;
- number;
- estimate;
- date/time;
- ordering;
- matching;
- ranking;
- rating;
- checklist;
- photo;
- video;
- audio;
- file;
- secret code;
- QR/checkpoint;
- judge score;
- pass/fail;
- custom result fields.

### Control blocks

- timer;
- countdown;
- stopwatch;
- pause gate;
- wait-until;
- approval gate;
- random draw;
- choose-one-path;
- branch;
- repeat loop with bounded attempts;
- completion gate;
- end activity;
- unlock another activity.

### Competition blocks

- create matchup;
- start heat;
- record winner;
- record placement;
- record time;
- record quantity;
- judge rubric;
- advance participant/team;
- tiebreaker trigger.

## 4. Variables

Activity logic can read/write scoped variables.

Scopes:

- platform;
- event;
- activity;
- team;
- participant;
- station;
- round/match;
- submission.

Examples:

- `team.score`
- `activity.elapsedSeconds`
- `submission.correctCount`
- `station.currentLoad`
- `match.winnerTeamId`
- `team.completedStationCount`
- `event.phase`

Avoid free-form variable names where a typed built-in property exists. Custom variables should have explicit data types.

## 5. Metrics

Generic result metrics make physical games configurable.

Metric types:

- time/duration;
- count;
- distance;
- height;
- weight/volume;
- score/points;
- percentage;
- accuracy;
- placement;
- judge rating;
- pass/fail;
- text remark;
- custom numeric metric with unit.

A game can define multiple metrics, e.g.:

```text
Water Transfer
- collected_volume_ml (higher is better)
- violations (lower is better)
- elapsed_seconds (lower is better)
```

## 6. Rules

Rules should be declarative.

```text
WHEN trigger
IF conditions
THEN actions
```

### Triggers

- event published;
- event started;
- scheduled time reached;
- activity opened;
- activity started;
- block viewed;
- answer submitted;
- answer validated;
- activity completed;
- score changed;
- QR scanned;
- station reached;
- marshal approved/rejected;
- timer expired;
- match completed;
- team enters/leaves queue;
- manual organizer trigger.

### Conditions

- comparison: ==, !=, >, >=, <, <=;
- set/list membership;
- contains / not contains;
- completed/not completed;
- answer correct/incorrect;
- score threshold;
- elapsed time threshold;
- attempt count;
- team attribute;
- participant attribute;
- prior activity state;
- station state/capacity;
- schedule/date/time window;
- random probability/draw;
- logical ALL/ANY/NOT groups.

### Actions

- reveal/hide block;
- unlock/lock activity;
- unlock/lock station;
- award/deduct points;
- apply bonus/multiplier;
- apply time penalty;
- increment/decrement metric;
- send message;
- route team;
- enqueue/dequeue;
- require approval;
- assign next activity;
- generate random content;
- create tiebreaker;
- mark complete/failed;
- disqualify result;
- finish event for team;
- log custom event.

## 7. Randomization primitives

Support deterministic server-side randomization where fairness matters:

- shuffle choices;
- sample N questions from bank;
- sample by category/difficulty;
- random stage order;
- random team route;
- random matchup;
- random representative draw;
- random mystery challenge;
- seeded generation for reproducibility/audit.

Store generated selections after publication/start so they remain stable for the intended scope.

## 8. Validation primitives

- required;
- min/max length;
- min/max numeric;
- exact number of selections;
- at-least/at-most selections;
- allowed file types;
- media limits;
- accepted text aliases;
- case/space/punctuation normalization;
- numeric tolerance;
- custom regex for advanced admin use;
- server-side custom validator registry.

## 9. Verification modes

A completion/result can be:

- auto-verified;
- self-declared;
- captain-confirmed;
- marshal-confirmed;
- judge-scored;
- opponent-confirmed;
- dual-confirmed;
- media-review-required;
- organizer-finalized.

Verification status should be explicit: `PENDING`, `ACCEPTED`, `REJECTED`, `OVERRIDDEN`, `VOID`.

## 10. Lifecycle

Generic activity lifecycle:

`DRAFT -> READY -> LOCKED -> LIVE -> PAUSED -> COMPLETED -> FINALIZED -> ARCHIVED`

Submissions/results can have their own lifecycle.

## 11. Plugin/registry principle

If a genuinely new interaction cannot be composed from existing blocks, add a new block type through a registry with:

- config schema;
- organizer editor;
- participant renderer;
- server validator;
- result serializer;
- tests;
- migration/version handling.

Never add behavior by checking an activity title.

