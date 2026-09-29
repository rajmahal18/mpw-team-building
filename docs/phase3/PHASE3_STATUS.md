# Phase 3 Status — Repository Foundation

## Goal

Turn Phase 1 doctrine and Phase 2 contracts into an actual repository without spending effort on final visual design.

## Implemented

### Platform foundation

- Next.js App Router + strict TypeScript project structure.
- PostgreSQL persistence contract via Prisma ORM 7.
- Prisma 7 driver-adapter architecture (`@prisma/adapter-pg`).
- Zod-owned event/activity/rule/scoring configuration contracts.
- Vitest architecture test suite.
- Phase 1 + Phase 2 documents preserved inside the repository.
- Root `AGENTS.md` carries the no-hardcoding constitution.

### Identity and access

- Staff user accounts with scrypt password hashing.
- Opaque server-stored session tokens; only hashes are persisted.
- Event roles use stable capabilities instead of hardcoded role names.
- Person and user account remain separate concepts in the DB model.
- Participant accounts are optional.
- Shared team participant sessions can be created using a team code.

### Event model

- Organization -> Event -> Teams / Participants / Roles / Activities.
- Event configuration is JSON validated through `EventConfigSchema`.
- Arbitrary team count and arbitrary team size are preserved.
- Team visual identity remains event data (`colorToken`, logo hook).

### Activity engine

- Stable `ActivityInstance` plus immutable `ActivityDefinitionVersion` rows.
- Generic `ParticipationEntry` actor abstraction.
- `ActivityRun` pins the exact definition-version ID used at runtime.
- Initial block registry includes content, MCQ/multi-select, text/fill, number, manual metric, marshal decision, acknowledge and judge-rubric primitives.
- Multiple-choice choice counts are arbitrary arrays, never A/B/C/D columns.
- Protected validation/matcher data is stripped from participant projections.
- Generic submission validation uses registry schemas.

### Rules and scoring

- Declarative condition AST.
- Declarative score-expression AST.
- No organizer-provided JavaScript/eval.
- Raw metrics are separate from append-oriented score entries.
- Generic rule planning exists for configured triggers/conditions/actions.
- Deterministic seeded shuffle utility exists for future draws/routes/questions.
- Generic round-robin competition primitive is activity-name agnostic.

### Operations and governance

- Audit-log persistence model and audit service.
- Domain-event/outbox persistence model.
- Event state-transition service.
- Event/activity preflight validation foundation.
- Submission idempotency key is unique per activity run.
- Derived score writes have their own idempotency key.

### Proof UI

- Organizer login.
- Event creation.
- Arbitrary team creation with optional shared team code.
- Generic activity creation.
- Raw JSON activity-definition editing for Phase 3 verification.
- Save validated config as a new draft version.
- Publish a version.
- Start a team activity run pinned to the current published version.
- Submit a generic block payload.
- Record a metric and compute derived score.
- Public/participant event page.
- Join event using team code without creating an account.
- Participant-safe activity projection.

The JSON editor is intentionally temporary. A proper organizer builder belongs to later phases.

## Deliberately deferred

- final MPW palette/branding;
- typography system;
- animation/motion;
- polished dashboards;
- drag/drop activity builder;
- complete block renderer catalog;
- question-bank UI;
- polished route-builder and complete station operations UI;
- media upload/storage;
- realtime updates;
- offline queue/sync;
- production rate limiting;
- SSO/enterprise identity;
- full tournament-format catalog;
- final reports/export UI.

These are deferred features, not architectural omissions.

## Verification limitation in this handoff

The execution environment timed out while downloading npm dependencies, so a real `npm install`, Prisma generation, Vitest run and Next production build could not be completed here. Static TypeScript parsing was attempted with the globally available compiler; diagnostics were dominated by intentionally unavailable project dependencies/generated Prisma types rather than syntax failures.

Run the validation commands in `VERIFY.md` immediately after installing dependencies on a networked development machine.

## Added before Phase 3 closeout: Amazing Race operational primitives

The Phase 3 repository also includes the physical-event primitives needed so Amazing Race and government team-building workflows are not retrofitted later:

- `Station`, `StationActivityAssignment` and `StationVisit` persistence;
- `RoutePlan`, `RouteStep` and `TeamRouteAssignment` persistence;
- `Competition`, `Match` and `MatchSide` persistence;
- station creation/state services and a basic organizer proof UI;
- route creation/replacement services with same-event validation;
- generic round-robin competition persistence over participation entries;
- signed, expiring station-checkpoint tokens using HMAC SHA-256;
- camera-app-friendly HTTPS checkpoint deep links;
- participant-session preservation: an unauthenticated scan redirects to the event join flow and then returns to the exact checkpoint;
- idempotent station check-in through a unique `checkInKey` and idempotent domain-event emission.

The checkpoint deep link is intentionally a web URL, not an in-app scanner requirement. QR artwork/rendering and permanent printable checkpoint-code management belong to a later operations/UI phase.

## Security/fairness rules enforced in Phase 3

- Public visitors do not receive playable activity definitions before joining an event.
- Participant activity projections strip answer keys, validation matchers and organizer-only choice notes.
- Raw organizer activity definitions require event-scoped capabilities, including answer-key access.
- Team join codes are stored as scrypt hashes rather than plaintext.
- Staff sessions use opaque random tokens with only hashes persisted in the database.
- Checkpoint tokens are server-signed, purpose-bound, event/station-bound and expiring.
- Redirect-after-join only accepts paths inside the same event namespace.

## Closeout counts

At Phase 3 closeout the source tree contains 58 TypeScript/TSX files, 8 Vitest test files, 33 Prisma models and 11 Prisma enums. These counts are descriptive only and are not product constraints.
