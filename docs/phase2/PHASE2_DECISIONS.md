# Phase 2 Architecture Decisions

## ADR-001 — Hybrid relational + typed JSON model

**Decision:** Runtime/operational entities are relational. Flexible definitions are versioned JSON validated by shared schemas.

**Why:** Fully relational block/rule systems become EAV-heavy and brittle. Fully JSON persistence becomes difficult to query, constrain, audit, and aggregate. The hybrid model gives flexibility without surrendering integrity.

## ADR-002 — Activity behavior is definition-driven

Activity behavior is determined by an immutable `ActivityDefinitionVersion`, never by `activity.name`, template slug, event name, or UI label.

## ADR-003 — Templates are copy sources, not live parents

When an organizer adds a library activity to an event, it creates an event-owned activity definition/version. Later library edits do not silently mutate the event.

## ADR-004 — Execution is modeled independently from definition

`ActivityInstance` describes what the activity is. `ActivityRun` describes one team's/participant's/heat's execution of it. This supports retries, multiple rounds, matches, team-specific content, and audit.

## ADR-005 — Actor references are generic but constrained

Runtime actions operate on an `Entry`/participation unit that can represent a whole team, one participant, a pair, a subgroup, or an ad-hoc side. Competition and activity-run logic should not be duplicated per actor type.

## ADR-006 — Questions are versioned reusable content

Question banks are reusable. Questions have immutable versions. Activity definitions can reference fixed question versions or a draw specification. Event lock/runtime generation records the actual selected versions.

## ADR-007 — No arbitrary code in organizer configuration

Organizer formulas, conditions, and actions are represented as typed expression trees. Never execute organizer-authored JavaScript, SQL, shell, or server code.

## ADR-008 — Raw metrics are canonical evidence

A time of `73.42 s`, volume of `850 mL`, judge rubric, and `12 correct` are raw results. Points and placement are derived. Re-scoring never destroys raw results.

## ADR-009 — Scores use an append-oriented ledger

Bonuses, penalties, manual adjustments, and overrides are recorded as separate score entries with provenance, not silently merged into one mutable number.

## ADR-010 — Publish/lock creates immutable snapshots

Competitive event content must be snapshot/version based. Live hotfixes create new versions with explicit effective scope and audit.

## ADR-011 — Randomization is persisted

The engine stores seed/scope/selection results whenever randomization affects fairness. Random behavior cannot depend on the browser's transient `Math.random()` state.

## ADR-012 — Frontend visual polish is deferred

Phase 2 defines only semantic presentation fields such as event logo, team color, terminology, visibility, and layout-independent capabilities. Palette design, typography, motion, component styling, and visual identity are later work.
