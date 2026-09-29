# AGENTS.md — Mandatory Instructions for Future Development

## Read this first

This repository is for the **MPW Team Building Platform**, a reusable government team-building event/game engine. It must not become a collection of one-off event hacks.

## The mantra

> **NO EVENT-SPECIFIC HARDCODING.**  
> **CONFIGURE BEHAVIOR; DO NOT PATCH BEHAVIOR.**  
> **BUILD PRIMITIVES, NOT ONE-OFF GAMES.**  
> **ORGANIZER POWER, PARTICIPANT SIMPLICITY.**

## What “no hardcoding” means

Never hardcode business/event-specific values such as:

- number of teams or players;
- team names, colors, logos, captains;
- event title, year, venue, dates, logos, theme colors;
- number or names of stations/checkpoints;
- game/activity names;
- question counts or answer-choice counts;
- scoring tables (e.g. 100/80/60);
- time limits;
- number of attempts;
- ranking/tie-breaker rules;
- route order;
- labels such as Team, Station, Marshal, Points;
- role names beyond stable platform capabilities;
- question text, answers, clues, hints, instructions;
- QR values;
- award names;
- department/division names;
- event-specific permissions;
- filenames or asset paths tied to one event.

Never add code such as:

```ts
if (event.name === "MPW Team Building 2026") { ... }
if (activity.name === "Sack Race") { ... }
if (teamCount === 8) { ... }
```

If a new activity requires behavior the engine cannot represent, first ask:

1. Is this behavior reusable across other possible activities?
2. Can it be expressed as a new generic field, block, metric, validator, rule, condition, action, or competition format?
3. Can it be added to a registry/schema instead of branching on an activity name?

Only after those questions should a new engine primitive be introduced.

## What may be code-defined

Some stable platform primitives must exist in code. Examples:

- field/input renderers;
- rule operators;
- verification adapters;
- scoring operators;
- competition-format engines;
- media types;
- auth/security invariants;
- data validation rules;
- audit logging;
- generic event lifecycle states;
- supported block types.

These are **engine capabilities**, not event content. They should be registry-based and extensible.

## Architecture rule

Prefer:

`ActivityTemplate -> ActivityInstance -> Blocks -> Rules -> Submissions -> Results`

Avoid:

`SackRaceTable`, `AmazingRaceTable`, `QuizBeeTable`, `WaterRelayTable`, etc.

Specialized tables are allowed only when the domain is truly structurally different and cannot be modeled safely by generic primitives.

## Template rule

Templates are data. A template can pre-fill configuration, but after an organizer adds it to an event, it becomes an independent `ActivityInstance` that can be modified without mutating the source template.

## UI rule

Organizer UI may expose advanced configuration, but participant UI must remain low-friction:

- scan/tap/open;
- understand the current task immediately;
- submit/complete with minimum taps;
- see status clearly;
- recover gracefully from bad connectivity.

## Government-context rule

Treat privacy, access control, auditability, retention, and event safety as architecture concerns, not polish items. Avoid collecting sensitive personal data unless a legitimate event requirement exists.

## Testing rule

Every new primitive must have tests proving it works with at least two materially different activity examples. A feature that only works for the game that motivated it is not generalized enough.

## Change-review checklist

Before merging any feature, confirm:

- Can an organizer configure this without code changes?
- Is any event-specific name/value embedded in logic?
- Does it support arbitrary team/player counts where relevant?
- Does it support zero/one/many optional components safely?
- Does the participant flow remain simple?
- Are permissions enforced server-side?
- Is every score/override auditable?
- Does the design work on a 320px-wide mobile screen?
- Does temporary network failure corrupt the event state?
- Can the same primitive plausibly serve another activity next year?


## Phase 2 implementation contract

> Phase 2 schemas and invariants are architectural contracts. Do not simplify them into event-specific structures for implementation convenience.

## Phase 3 implementation notes

- Business rules belong in `src/domain`, `src/engine`, or `src/server/services`, never primarily in route components.
- Persist polymorphic JSON only after Zod validation.
- Participant projections must strip protected answer-key fields server-side.
- Published activity definition versions are immutable. Corrections create a new version.
- `ActivityRun.activityDefinitionVersionId` is historical truth and must never silently follow a newer version.
- All critical mutations must be idempotent or protected by a unique idempotency key.
- Frontend polish is deferred. Do not couple domain behavior to current CSS or page structure.

## Phase 4 library rules

- The activity library is convenience data, never the definition of what the engine can support.
- Organization templates use immutable versions.
- Adding a template to an event MUST materialize an independent ActivityDefinition copy; never create live inheritance that can mutate past/current events.
- Team count and team size are derived from rows/memberships, not fixed event columns.
- Organizer-facing categories, tags, labels, roles, and terminology are data and must remain extensible.
- Phase 5 visual builders must edit the existing typed contracts; do not weaken the domain model to make form code easier.


## Phase 5 activity/content-builder rules

- The visual builder edits the canonical typed `ActivityDefinition`; never introduce a parallel form-only model.
- A quiz is composition, not a named engine. Never branch on `Quiz`, `Amazing Race`, or any activity title.
- Multiple-choice options, rubric criteria, matching pairs, ordering items, marshal options, metrics, rules and actions are arrays with arbitrary organizer-defined counts.
- Question pools are immutable definition content; run-specific random selections are generated only when the run starts and pinned to the run.
- Participant projections must never expose answer keys, accepted-answer matchers, numeric acceptance ranges/tolerances, correct order, correct matching pairs, or unselected question-bank content.
- Server-side submission handling must reject a question-bank question that was not selected for that run.
- Auto-grading must be implemented as reusable block semantics, never by question text or activity name.
- Organizer-defined logic remains structured AST/configuration. Never execute organizer JavaScript or eval-like expressions.
- Visual saves create immutable draft versions; published versions are never edited in place.
- Media contracts may exist before binary upload UX, but do not fake stored media or hardcode asset paths.


## Phase 7 scoring/competition rules

- Never collapse raw performance, derived score, placement and event total into one mutable field.
- Score corrections are append-only ledger operations. Reverse or supersede; do not delete history.
- Placement point tables, tie-break chains, category weights, best-N/drop-lowest behavior and rank styles are organizer configuration, never constants.
- Leaderboard definitions are mutable interpretation config; leaderboard snapshots are immutable result revisions.
- Multiple attempts require an explicit aggregation policy (BEST/LATEST/SUM/AVERAGE). Never accidentally sum retries.
- Competition formats are reusable plugins over Competition/Match/MatchSide. Never branch on a game/activity title.
- Do not rewrite an elimination result after downstream matches exist without an explicit audited bracket reset/void workflow.
- The server owns scoring, ranking and finalization. Clients may display or propose inputs but must not become scoring authority.

## Phase 8 participant/PWA rules

- PWA installation is optional. A normal HTTPS browser flow must remain fully supported.
- Never depend on Background Sync for correctness; durable foreground/reconnect retry is the baseline.
- Never cache personalized participant/event HTML in a shared service-worker page cache. Team/run-specific offline state belongs in scoped device-local storage.
- Persist participant mutations before attempting delivery, and make server mutations replay-safe/idempotent.
- Client-side offline state is never scoring authority. The server validates submissions, answer keys, run selection and scores.
- Media submission semantics come from generic activity-block configuration; storage backend and media moderation are infrastructure/operations concerns.
- Failed media retries must not duplicate assets or consume configured max-item counts twice.
- Low-data mode is a transport/presentation preference, never a different game rule.
- Public, participant, staff-only, hidden and final-only views must reuse the canonical privacy and leaderboard contracts.
- Participant pages must remain usable from the phone camera's ordinary QR deep link; do not require a proprietary scanner or app install.

## Phase 9 government-hardening rules

- Treat NPC Circular 2023-06 as the current privacy/security baseline; NPC Circular 16-01 is superseded and must not be cited as the current government security standard.
- Privacy-by-design/default is an engineering requirement, not a document-only exercise.
- Never log passwords, team join codes, session tokens, cookies, signing secrets, private keys, or raw media bytes.
- Server-side capability checks remain mandatory even when a page/action is hidden from the UI.
- State-changing API endpoints must use authentication plus same-origin protection where browser cookies are involved.
- Rate limiting is a generic security primitive; never make it an event/game rule.
- Public/event/staff media access must be enforced by the server against the canonical event privacy policy.
- Retention must be configurable and backed by an approved records schedule. Never invent a universal deletion period in engine code.
- Automatic retention purge must never silently delete official audit/history/final-result records without an explicit approved policy.
- Security incident records are operational evidence. Do not encode legal breach-reportability decisions as automatic rules.
- Backup records document evidence; the application is not a substitute for infrastructure backup and restore testing.
- Exports must use canonical persisted records/snapshots, be permission-protected, rate-limited, and audited.
- Privacy notices and PIAs are versioned records. Never overwrite historical versions.
- New security/privacy capabilities must remain reusable across all activities/events.

## Phase 9 deployment rule

A successful build is not sufficient for production. Production readiness requires:

`code validation -> migration review -> security headers -> secrets -> privacy approval -> PIA -> retention schedule -> backup -> restore drill -> incident contacts -> accessibility audit -> field pilot -> release`

## Phase 9 implementation reconciliation

The repository must keep Prisma schema and service usage aligned. If code references an `ActivityTemplate`, `ActivityTemplateVersion`, or another persisted entity, that entity must exist in the canonical schema and migration history. Do not rely on an ungenerated/stale Prisma client.


## Phase 10 productization rules

- Keep the generic engine and typed contracts authoritative; UI may present them more clearly but must not invent event-specific behavior.
- Participant/public styling must consume event branding tokens through the shared theme adapter; do not fork pages per event.
- Organizer navigation should expose operational workflows first. Keep Engine Lab visibly secondary/developer-facing.
- Outdoor/mobile participant screens prioritize large targets, readable contrast, obvious current state, and graceful weak-network behavior.
- Projector mode must reuse canonical leaderboard contracts and snapshots; never create a second scoring path for presentation.
- Production logs are structured and secret-redacted. Never log credentials, cookies, access codes, tokens, or raw secrets.
- Error and empty states must preserve user confidence and never imply that data was modified when rendering fails.
- Phase 10 is productization, not an excuse to add hardcoded event names, years, team counts, stations, games, winners, or placement assumptions.
