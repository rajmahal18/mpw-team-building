# Phase 5 Status — Activity + Question/Content Builder

## Goal

Give MPW organizers 360-degree activity/content authoring without raw JSON and without introducing named-game logic.

## Implemented

### Visual Activity Builder

The organizer activity page now edits the same typed `ActivityDefinition` contract used by the runtime engine.

Organizer controls now cover:

- title, machine key, description, tags;
- add/remove/reorder content blocks;
- change a block type without changing engine code;
- participation mode and representative selection;
- activity attempts and completion policy;
- timing and verification policy;
- raw metric definitions;
- structured scoring-expression AST;
- structured WHEN / IF / THEN rules;
- safety, environment, accessibility and staff notes;
- live preflight issues;
- participant-safe preview;
- organizer test mode;
- save-as-new-draft-version and separate publish flow.

Final MPW visual design remains intentionally deferred.

### Content primitives

Phase 5 expands the generic block registry to cover:

- rich instructions;
- media display references;
- single-select questions;
- multi-select questions;
- fill-in-the-blank;
- short text;
- long text;
- numeric response;
- ordering;
- matching;
- reusable question banks / random draw;
- photo/video/audio/file evidence submission contract;
- manual metric entry;
- arbitrary marshal decisions;
- arbitrary judge rubrics;
- acknowledgement blocks.

A quiz is therefore not a separate engine. It is an activity composed mostly of question blocks. An Amazing Race station may mix instructions, questions, evidence, physical metrics and marshal validation in the same definition.

### Flexible question authoring

There are no A/B/C/D database or code fields.

Choices are arbitrary arrays and support organizer-defined counts. Question behavior can configure:

- arbitrary answer choices;
- one or multiple correct choices;
- shuffle behavior;
- exact or partial multi-select grading;
- multiple accepted text answers;
- whitespace/case/punctuation/Unicode normalization;
- fuzzy text threshold;
- exact/range/absolute-tolerance/percent-tolerance numeric answers;
- arbitrary ordering items;
- arbitrary matching pairs;
- hints;
- per-question time-limit contract;
- per-question max attempts;
- optional points and proportional/no-partial-credit behavior;
- optional prompt media reference.

### Question banks and randomization

`question_pool` is a generic content primitive.

- A pool may use every authored question or draw random N.
- Selected order may be shuffled.
- Each activity run receives a new server-generated random seed.
- The selected question IDs are pinned to `ActivityRun.generatedContentJson`.
- Randomization records are persisted through the generic randomization service.
- Participant projection does not expose unselected question-bank content by default.
- The submission service rejects attempts to submit a question that was not selected for that run.

This makes the live question set non-existent until the run starts, which reduces prior knowledge advantages even for someone familiar with the platform code.

### Auto-grading

Added a generic pure grading engine for:

- single select;
- multi-select exact-set;
- multi-select proportional credit;
- exact/contains/fuzzy text responses;
- numeric exact/range/tolerance;
- ordering;
- matching.

Grading output is stored in `Submission.validationJson`. Manual-review responses remain explicitly non-auto-gradable rather than being guessed.

Per-question maximum attempts are enforced server-side.

### Fair participant projection

Participant-safe projection now strips:

- correct choice IDs;
- text accepted answers and fuzzy matcher details;
- numeric acceptance rules;
- correct ordering;
- correct matching pairs;
- organizer notes on answer choices.

Question pools expose only the selected questions when a run selection is supplied. Without a run selection, the safe default is to expose no bank questions.

### Visual scoring and rules

The builder edits structured ASTs rather than arbitrary organizer code.

Scoring supports constants, metrics, arithmetic, min/max, clamp, round and conditional expressions.

Rules support generic triggers, recursive conditions and actions such as score adjustments, run failure and activity unlocks. No organizer JavaScript or activity-title branching is introduced.

## Deliberately deferred

Phase 5 defines media display/submission contracts, but the actual binary media storage/upload experience belongs to the participant/media work in Phase 8.

Per-question timer configuration is authored now. Precise client-side question-open timing, offline timer reconciliation and reconnect behavior belong to the participant runtime/offline phase.

The polished station/route/live control experience remains Phase 6.
