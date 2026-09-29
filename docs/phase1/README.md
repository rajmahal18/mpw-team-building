# MPW Team Building Platform — Phase 1 Research Pack

Status: **Phase 1 — Research & Product Constitution**  
Primary product: **Reusable MPW Team Building Platform**  
Primary delivery: **Mobile-first responsive web app / PWA**  
Primary use case: **Government team-building events, Amazing Race-style activities, station games, field games, quizzes, relays, collaborative tasks, and custom organizer-authored activities.**

## What this pack is for

These files are the pre-code product constitution. Future implementation should read `AGENTS.md` and `PROJECT_CONSTITUTION.md` before changing architecture or adding features.

The product is **not** a one-event Amazing Race app. It is an event/game engine where organizers configure an event, teams, branding, routes, activities, scoring, timing, verification, and content without needing code changes.

## Core thesis

> **Rigid engine, flexible configuration. No event-specific hardcoding.**

The system should represent known and unknown future activities through reusable primitives. The activity library is a convenience layer, not the architecture.

## Files

- `AGENTS.md` — mandatory instructions for future coding agents/developers.
- `PROJECT_CONSTITUTION.md` — product mantra, hardcoding rules, product boundaries.
- `RESEARCH_FINDINGS.md` — internet research synthesis and lessons from existing platforms.
- `CONFIGURATION_UNIVERSE.md` — everything that should be configurable.
- `ACTIVITY_ENGINE.md` — generic primitives, blocks, rules, conditions, actions, metrics.
- `QUESTION_AND_CONTENT_ENGINE.md` — organizer-authored quiz/content system.
- `ACTIVITY_DICTIONARY.md` — broad catalog of government/team-building activity archetypes.
- `EVENT_OPERATIONS.md` — teams, stations, marshals, routes, queues, schedules, equipment.
- `SCORING_COMPETITION_AND_RESULTS.md` — scoring, rankings, tournaments, tie-breakers, audit.
- `PARTICIPANT_PWA_AND_QR.md` — participant UX, QR flows, offline/resilience.
- `GOVERNMENT_PRIVACY_SAFETY_ACCESSIBILITY.md` — Philippine government context, privacy, safety, inclusion.
- `TEN_PHASE_ROADMAP.md` — development phases from research to production launch.

## Non-negotiable product behavior

1. Organizers can create their own events and activities.
2. Organizers can author their own questions and content.
3. Counts are data: teams, players, stations, rounds, questions, choices, attempts, winners, etc.
4. Labels are data: Team/Group/Squad, Station/Checkpoint, Marshal/Facilitator, Points/Stars, etc.
5. Branding is data: event logo, team logo, colors, typography options, sponsor marks.
6. Rules are data: scoring, time limits, penalties, verification, routes, progression.
7. Templates are reusable starting points, never hardcoded event behavior.
8. Physical activities and digital activities must live in the same scoring/event engine.
9. Player-facing flow must stay simple even when organizer configuration is powerful.
10. No feature should assume one specific MPW event, year, venue, team count, or game list.

