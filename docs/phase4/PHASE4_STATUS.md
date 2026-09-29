# Phase 4 Status — Organizer Event Builder & Activity Library

## Goal

Turn the Phase 3 engine into a reusable organizer workspace without spending time on final visual polish or prematurely building the Phase 5 activity/question editor.

## Implemented

### Organizer workspace

- Event-scoped organizer navigation: Overview, Event Setup, Activity Library, Event Activities, Engine Lab.
- Phase 3 raw controls preserved in Engine Lab for debugging and architecture verification.
- Event overview shows arbitrary counts for teams, participants, activities, stations, routes and competitions.
- Schema-level preflight remains visible before lifecycle transitions.

### Event builder

- Editable event name, short name, slug, timezone, start and end schedule.
- IANA-timezone conversion helper for `datetime-local` values instead of assuming server timezone.
- Fully configurable terminology (`Team`, `Participant`, `Station`, `Marshal`, `Points` labels).
- Account requirement, device mode and late-join policy.
- Leaderboard enablement, visibility, timing, top-N and score visibility.
- Event/privacy/media visibility and retention period.
- Schedule enforcement and early check-in configuration.
- Branding hooks stored as data: logo/cover asset references, team-color behavior, semantic theme tokens.

### Flexible teams and roster

- Team count remains emergent from Team rows; there is no `numberOfTeams` business constraint.
- Team size remains emergent from memberships; uneven team sizes are valid.
- Single-team creation and configurable bulk numbered-team creation.
- Team name, abbreviation, color token, logo reference and join code are editable.
- Teams archive instead of being destructively deleted.
- Participants can be added without user accounts.
- Optional organization external key supports future employee/HR/import identity matching.
- Participants may remain unassigned or move between teams.
- Membership role is arbitrary organizer data instead of a fixed captain/member enum.

### Organization activity library

- Added relational `ActivityTemplate` and immutable `ActivityTemplateVersion` models.
- Templates belong to the organization, not to one event year.
- Current template version is explicit.
- Adding a template to an event materializes an independent validated ActivityDefinition copy.
- Existing event activities therefore never silently change when the library evolves.
- Event activities can be saved back to the organization library for future reuse.
- Library supports arbitrary categories and tags.
- Search/filter UI does not encode a fixed category taxonomy.

### Recommended MPW starter library

Starter content is seed-like data, not engine behavior. The engine never branches on these names.

- Checkpoint Task
- Timed Physical Challenge
- Quantity / Collection Challenge
- Quiz Starter
- Judged Creative / Performance Task
- Retrieval / Bring-Me Task
- Team-vs-Team Result
- Reflection / Debrief

These are deliberately generic government/team-building patterns. Organizers can create entirely different templates later.

## Deliberately deferred to Phase 5+

- visual drag/drop block builder;
- full question authoring UI;
- arbitrary MCQ option editor UI;
- fill-in accepted-answer editor;
- scoring-expression visual builder;
- conditional rule builder;
- media upload/storage;
- polished station/route builder;
- live operations dashboard;
- final MPW color system, typography and motion.

## Important architecture rule

The library is not the activity engine. A missing library template must never imply that the platform cannot represent a game. Templates are conveniences composed from generic primitives.
