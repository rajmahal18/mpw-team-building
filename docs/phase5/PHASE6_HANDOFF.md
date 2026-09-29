# Phase 6 Handoff — Flow, QR, Stations & Live Operations

Phase 5 has completed activity/content authoring. Phase 6 should focus on field operations rather than expanding the question editor unless a genuinely missing reusable primitive is discovered.

## Phase 6 priorities

- visual station builder;
- assign one or many activity instances to stations;
- fixed, free, circular and randomized route modes;
- per-team route assignment;
- station prerequisites and unlock conditions;
- signed QR generation and checkpoint deep-link management UI;
- QR scan -> existing participant session -> instant check-in;
- QR scan -> no session -> join/login -> return to checkpoint;
- marshal mobile view;
- station arrivals, active teams, queue/capacity and completion approvals;
- live event control center;
- pause/resume/fallback controls;
- congestion visibility;
- organizer announcements;
- offline/retry-safe operational mutations;
- full audit trail for overrides.

## Do not do

- Do not create an `AmazingRace` code path. Amazing Race remains a composition of stations, routes, activity definitions, QR visits and rules.
- Do not duplicate activity/question forms inside station pages. Stations reference activity instances.
- Do not expose full question banks in participant station payloads. Use run-specific question selections.
- Do not make accounts mandatory for participants.
- Do not begin final visual-brand polish yet unless required for field usability.
