# Phase 5 Architecture

## Core rule

> The visual builder is an editor for the engine contract. It is not a second activity model.

Flow:

`Organizer UI -> ActivityDefinition -> preflight -> immutable ActivityDefinitionVersion -> runtime`

There is no conversion into a Quiz table, AmazingRace table, SackRace table or named-game handler.

## Question model

Question types are stable engine primitives. Organizer content remains data.

`QuestionBlock` is a subset of `ActivityBlock` and currently includes:

- single select;
- multi select;
- fill blank;
- short text;
- long text;
- number;
- ordering;
- matching.

The engine may gain additional reusable question primitives later, but not activity-name branches.

## Question pools

A `question_pool` contains versioned question blocks inside the activity definition.

At run start:

1. the exact published activity version is loaded;
2. a fresh cryptographic run seed is created;
3. each random pool is shuffled through the generic deterministic randomizer;
4. configured N questions are selected;
5. selected order is optionally shuffled;
6. selected IDs are pinned to the run;
7. participant payloads are filtered to that selection.

The bank itself remains part of the immutable definition version; the draw is run-specific historical truth.

## Auto-grading

`gradeBlockSubmission` is pure engine logic. It accepts a typed block and typed submission payload and returns a serializable validation result.

Correctness is independent from submission transport status. A wrong answer can still be an accepted submission; its validation record states that it is incorrect.

This prevents overloading submission status with game semantics.

## Scoring separation

Question grading may calculate question-level earned points in validation output, but the platform still preserves the Phase 2 rule:

`raw submission/result != derived activity score != event contribution`

Phase 7 will own broader event scoring and leaderboard composition.

## Security boundaries

Answer-bearing definitions require organizer capabilities.

Participant payloads are sanitized server-side. The UI must never be trusted to hide answer keys.

Question-bank selection must be checked server-side on submission. A participant cannot submit an unselected bank question merely by knowing its block ID.
