# MPW Team Building Platform — Phase 10 / v1.0

A reusable, configurable government team-building event/game engine.

> **No event-specific hardcoding. Configure behavior; do not patch behavior.**

Phase 10 completes the v1.0 productization layer on top of the audited government/privacy/security baseline: a production visual system, event-aware participant theming, refined organizer workflows, projector polish, structured observability, deployment automation, acceptance gates, and pilot runbooks.

## What works now

- organization + staff auth and capability-based event roles;
- optional participant/team sessions — personal accounts are not required to play;
- multi-event setup, arbitrary teams and roster;
- reusable versioned Activity Library;
- visual activity/question/content builder;
- arbitrary-choice questions and mixed question banks;
- server-side random question draw and generic auto-grading;
- raw metrics, judge rubrics and structured scoring expressions;
- stations, route plans, per-team route snapshots and route unlocks;
- signed/expiring/rotatable/revocable checkpoint QR credentials;
- normal camera-app QR -> team session/join -> checkpoint return flow;
- station capacity, FIFO queues, marshal controls, rerouting and live event control;
- append-only score ledger with bonus/penalty/manual/override/reversal entries;
- raw metric or score -> placement -> arbitrary placement points;
- weighted multi-source event aggregation;
- best-N and drop-lowest scoring;
- explicit multiple-attempt policies;
- configurable tie-break chains and rank styles;
- live organizer leaderboard;
- immutable provisional/final result snapshots;
- generic round-robin competition engine;
- generic single-elimination engine with byes and auto-advancement;
- match officiating and competition finalization;
- audit logs + domain events for critical score/result operations;
- mobile-first participant activity runtime and event progress view;
- optional installable PWA shell with offline fallback;
- device-local event/activity snapshots for offline read recovery;
- IndexedDB durable outbox for answers and media proof;
- reconnect/focus/manual mutation synchronization;
- low-data image compression and media retry handling;
- generic media storage, SHA-256 retry deduplication and marshal moderation;
- privacy-aware event gallery;
- participant/public/projector leaderboard views reusing Phase 7 contracts;
- Phase 3 raw controls retained under **Engine Lab**.


## Phase 9 government hardening

- versioned privacy notices and participant-facing privacy notice route;
- PIA and processing-record foundation;
- data-subject request register;
- security incident/breach register;
- database-backed rate limiting;
- same-origin API protection;
- security headers / HSTS / CSP report-only baseline;
- hardened staff and participant cookies/session handling;
- audit secret redaction;
- privacy-aware media authorization;
- controlled event retention preview/purge;
- backup/restore evidence records;
- canonical CSV reports and export audit trail;
- event audit viewer;
- accessibility baseline and release checklist.

## Organizer surfaces

For `/admin/events/<eventId>`:

- **Overview** — lifecycle and counts;
- **Event Setup** — event rules, teams, roster and branding hooks;
- **Activity Library** — reusable organization templates;
- **Event Activities** — visual activity/content authoring;
- **Stations** — field checkpoints and marshal operation;
- **Routes** — reusable route policies and per-team assignment;
- **Live Control** — congestion, progress, pause/fallback and announcements;
- **Scores** — ledger, placements, overall leaderboard, tie-breakers and result revisions;
- **Competitions** — round robin / single elimination and match results;
- **Media** — participant proof review, approval/rejection/hiding and gallery governance;
- **Audit** — event-level immutable operational history;
- **Reports** — canonical CSV exports;
- **Engine Lab** — low-level proof/debug controls.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript strict mode
- PostgreSQL
- Prisma ORM 7 + PostgreSQL driver adapter
- Zod 4
- Vitest 5

## Setup

Use Node.js 24.13.1 (see `.nvmrc`) with its bundled npm. On Windows with nvm-windows, run `nvm install 24.13.1` if needed, then `nvm use 24.13.1` before installing dependencies. Node.js 20 is below this project's minimum version, and npm 10 can crash with `Cannot read properties of null (reading 'edgesOut')` while resolving the dependency tree.

```bash
cp .env.example .env
npm install
npm run db:migrate -- --name phase9
npm run db:seed
npm run dev
```

Set a real `SEED_ADMIN_PASSWORD` before seeding.

## Architecture rule

Competitive truth flows as:

`raw performance -> derived score -> placement -> event contribution -> leaderboard -> immutable result snapshot`

Do not short-circuit those layers into a mutable `team.score` column.

Read `AGENTS.md`, the phase 1–2 constitution/domain docs, the latest phase status/architecture docs, and `docs/phase9/GOVERNMENT_PRIVACY_SECURITY.md` before changing core behavior.

## Phase 10 / v1.0

The repository now includes the production visual system and launch-readiness documentation under `docs/phase10/`. The generic engine remains authoritative; productization does not introduce event-specific behavior.
