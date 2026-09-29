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

