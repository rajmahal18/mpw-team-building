# Ten-Phase Roadmap

The phases intentionally separate product architecture from implementation so flexibility is designed before UI/code creates accidental constraints.

## Phase 1 — Research & Product Constitution

**Goal:** define the universe before repository creation.

Deliverables:

- research synthesis;
- product mantra;
- no-hardcoding rules;
- activity taxonomy;
- configuration universe;
- activity/question/scoring/flow primitives;
- government privacy/safety/accessibility baseline;
- PWA/QR direction;
- 10-phase roadmap.

Exit condition: future developer/AI can explain how to add a never-before-seen activity without editing event-specific logic.

**Status: COMPLETE in this research pack.**

## Phase 2 — Domain Model & Configuration Schemas

**Goal:** turn the constitution into typed domain contracts before building screens.

Deliverables:

- ERD/domain model;
- Prisma model proposal;
- TypeScript/Zod configuration schemas;
- activity block registry;
- rule/condition/action schema;
- scoring schema;
- lifecycle/state machines;
- template vs instance semantics;
- versioning strategy;
- audit event taxonomy;
- example JSON configs for 10+ materially different activities.

Exit test: sack race, custom quiz, Amazing Race checkpoint, judged performance, and round-robin activity fit without special-case tables/logic.

## Phase 3 — Repository Foundation & Multi-Event Core

**Goal:** build the reusable platform skeleton.

Deliverables:

- Next.js application;
- PostgreSQL/Prisma;
- auth + guest/team sessions;
- RBAC/capabilities;
- event CRUD/lifecycle;
- event branding/theme;
- terminology config;
- teams/participants;
- audit log foundation;
- secure server APIs/actions.

## Phase 4 — Organizer Event Builder & Activity Library

**Goal:** organizers can create a complete event structure without code.

Deliverables:

- event wizard;
- team configuration;
- schedule/phases;
- station builder;
- activity template library;
- clone/customize/save-as-template;
- materials/safety metadata;
- event validation/preflight;
- import/export starter formats.

## Phase 5 — Activity + Question/Content Builder

**Goal:** 360-degree content authoring.

Deliverables:

- block-based activity editor;
- flexible MCQ/multi-select;
- text/fill blank/numeric/order/match inputs;
- media tasks;
- question banks;
- random selection/shuffling;
- attempts/hints/timers;
- validation and auto-grading;
- organizer preview/test mode.

## Phase 6 — Flow, QR, Stations & Live Operations

**Goal:** run Amazing Race/station events in the field.

Deliverables:

- fixed/free/random routes;
- per-team routes;
- QR deep links/check-in;
- prerequisite/unlock conditions;
- rule engine;
- marshal mobile view;
- approvals;
- station status/queues/capacity;
- announcements;
- event pause/fallback controls.

## Phase 7 — Scoring, Competitions & Leaderboards

**Goal:** support heterogeneous scoring and competition structures.

Deliverables:

- raw metrics vs derived score;
- placement points;
- time/count/quantity/judge scoring;
- penalties/bonuses;
- tie-break chains;
- overall event aggregation;
- provisional/final results;
- live leaderboard;
- round robin / single elimination minimum tournament plugins;
- score audit/override UX.

## Phase 8 — Participant PWA, Offline Resilience & Media

**Goal:** field-ready participant experience.

Deliverables:

- mobile-first participant shell;
- guest/team-code join;
- current-task UX;
- offline cache strategy;
- queued/idempotent submissions;
- upload retry/compression strategy;
- media gallery/moderation;
- installable PWA optional;
- public scoreboard/projector mode.

## Phase 9 — Government Hardening, Reports & Accessibility

**Status: COMPLETE in the Phase 9 source package.**

**Goal:** move from fun prototype to credible MPW internal system.

Deliverables:

- privacy/data inventory support;
- retention settings;
- export/reporting;
- audit viewer;
- backup/recovery runbook;
- accessibility review;
- safety/event checklists;
- role/access review;
- security testing;
- performance testing for target event size;
- organizer documentation.

## Phase 10 — MPW Production Event & Reusable Library Expansion

**Goal:** launch a real MPW team-building event and convert lessons into platform improvements.

Deliverables:

- production deployment;
- dry run;
- event-day support plan;
- seeded MPW Activity Library;
- final organizer templates;
- post-event archive/report;
- bug/UX findings;
- reusable improvements only—no event-specific hacks;
- v1.0 release baseline.

## Rule across all phases

A later phase may add capabilities, but it must not violate the Phase 1 constitution. When a real event exposes a missing behavior, extend the generic engine rather than coding an MPW-year-specific exception.

