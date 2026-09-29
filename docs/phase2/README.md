# MPW Team Building Platform — Phase 2 Domain & Schema Pack

## Phase objective

Turn the Phase 1 product constitution into implementation-grade domain contracts **before repository creation**.

This phase intentionally does **not** polish frontend design, color palette, typography, theme, animation, or visual identity. Theme/branding remain configurable domain data, but visual system decisions are deferred.

## Core architecture decision

> **Rigid relational runtime + versioned typed configuration.**

Use relational models for identity, permissions, teams, stations, routes, attempts, submissions, metrics, scores, competitions, audits, and runtime state. Use versioned JSON definitions—validated by TypeScript/Zod—for blocks, question content, rule graphs, scoring definitions, and activity configuration.

This gives us:

- no event-specific tables;
- no activity-name branching;
- queryable operational data;
- safe schema validation;
- immutable published snapshots;
- organizer-authored arbitrary content;
- extensibility through registries.

## Phase 2 non-negotiables

1. No business logic may depend on an event/activity/team/station name.
2. No fixed team count, player count, station count, question count, choice count, winner count, or route count.
3. Questions and choices are organizer data, never source-code constants.
4. Physical and digital activities share the same execution/result model.
5. Raw performance metrics are stored separately from derived scores and placements.
6. Published/locked content is immutable by version; edits create new versions.
7. Random selections are server-generated, stored, reproducible where fairness requires it, and auditable.
8. Participant payloads never contain hidden answer keys or organizer-only fields.
9. Every consequential manual override is audited.
10. Rules and formulas use a typed DSL/AST—not arbitrary JavaScript `eval`.
11. Runtime mutations are idempotent where retries are plausible.
12. Every new engine primitive must prove usefulness across at least two materially different activities.

## Files

- `DOMAIN_MODEL.md` — bounded contexts, entities, relationships, ERD.
- `PRISMA_MODEL_PROPOSAL.md` — proposed relational schema and persistence rules.
- `CONFIG_AND_ZOD_CONTRACTS.md` — TypeScript/Zod-style configuration contracts.
- `BLOCK_AND_PLUGIN_REGISTRIES.md` — extensible block/question/competition registries.
- `RULE_ENGINE.md` — trigger/condition/action DSL and deterministic execution.
- `SCORING_AND_RESULTS_MODEL.md` — raw metrics, scoring AST, adjustments, placements, finalization.
- `LIFECYCLE_STATE_MACHINES.md` — event, station, activity-run, submission, competition states.
- `VERSIONING_SNAPSHOTS_AND_RANDOMIZATION.md` — templates, immutable versions, event lock, seeds.
- `IDENTITY_RBAC_AND_CAPABILITIES.md` — optional accounts, people, event participants, roles/capabilities.
- `AUDIT_AND_DOMAIN_EVENTS.md` — audit taxonomy, outbox/domain events, override requirements.
- `VALIDATION_INVARIANTS.md` — preflight and server invariants.
- `EXAMPLE_ACTIVITY_CONFIGS.md` — materially different government/team-building examples.
- `ARCHITECTURE_PROOF_MATRIX.md` — proof that the model handles varied activities without special casing.
- `PHASE3_REPO_CONTRACT.md` — exact contract the eventual repository must respect.
- `PHASE2_DECISIONS.md` — concise ADR-style decisions.

## Phase exit test

Phase 2 is complete only if all of these can be represented without a dedicated activity table or name-based conditional:

- Amazing Race QR checkpoint;
- free-roam scavenger hunt;
- organizer-authored mixed-format quiz with arbitrary choice counts;
- timed sack race;
- water-transfer quantity challenge;
- judged team chant/performance;
- construction challenge with multiple raw metrics;
- tug-of-war bracket;
- marshal-only pass/fail activity;
- optional bonus activity;
- non-scored reflection/feedback;
- a new custom activity not known when the code was written.
