# Project Constitution

## Product definition

The MPW Team Building Platform is a reusable, configurable event and activity engine for government team-building programs. It must support Amazing Race-style events, rotating stations, physical field games, quizzes, collaborative challenges, Filipino games, creative tasks, tournament-style competitions, and organizer-created activities.

It is not tied to one year, one venue, one activity set, or one event format.

## Product mantra

### 1. Rigid engine, flexible event

The engine enforces integrity, permissions, auditability, and generic rules. Everything that naturally changes from event to event should be configuration.

### 2. Activity templates are suggestions, not limitations

The Activity Library should make common activities fast to create. Organizers must still be able to customize or build activities from primitives.

### 3. Organizer-authored content is first-class

Questions, choices, answers, clues, hints, instructions, images, videos, station notes, scoring, penalties, and success criteria must be editable by authorized organizers.

### 4. No fixed counts

The platform must not assume:

- 4/6/8 teams;
- 5/10 players per team;
- 4 multiple-choice options;
- 3 winners;
- 5 stations;
- 10 questions;
- 1 marshal per station;
- 1 device per player;
- 1 scoring method.

Counts should be schema-validated configuration.

### 5. Physical and digital games share one event model

A QR scavenger hunt, a sack race, a quiz bee, a tower-building challenge, and a judged performance should all be representable as activities with participants, rules, submissions/results, scoring, verification, and lifecycle.

### 6. Build for unknown future games

We cannot predict every activity MPW will invent. Therefore the system must model reusable primitives:

- inputs;
- outputs;
- metrics;
- timers;
- validation;
- verification;
- conditions;
- actions;
- scoring;
- progression;
- competition structures.

### 7. Event-specific terminology is configurable

Examples:

- Team / Group / Squad / Delegation
- Station / Checkpoint / Booth / Area
- Marshal / Facilitator / Judge / Referee
- Points / Stars / Credits
- Player / Participant / Member

UI copy should resolve terminology from event configuration where practical.

### 8. Mobile-first participant experience

Participants should not need to install a native application. QR codes should open normal HTTPS links. If already authenticated/joined, check-in can continue immediately; otherwise authentication/team identification should preserve the destination and return the participant to the intended checkpoint.

### 9. Progressive enhancement

Core participation must work in a normal mobile browser. PWA installation is optional. Avoid making the event depend on browser APIs with weak cross-browser support when a reliable fallback exists.

### 10. Offline-resilient, not offline-delusional

The app should cache event shell/content where safe, queue submissions when feasible, prevent duplicate writes, clearly show unsynced state, and reconcile with the server. Server authority remains the source of truth for competitive results.

### 11. Audit every consequential manual action

Score changes, penalties, disqualifications, overrides, approvals, rejected submissions, team changes, and result edits must capture actor, timestamp, before/after values, and reason when appropriate.

### 12. Fairness by design

Randomization, hidden question banks, server timestamps, signed checkpoint tokens, unique submissions, and immutable published snapshots should reduce accidental unfairness. Organizers still retain explicit override powers with audit trails.

### 13. Safety and inclusion are configurable constraints

Activities should support metadata such as intensity, mobility demand, indoor/outdoor, water exposure, required equipment, accessibility notes, contraindication/safety notes, minimum/maximum players, and alternative participation roles.

### 14. Privacy by design

Collect the minimum data needed. Do not turn a fun event into an employee surveillance system. Media visibility, profile visibility, retention, and consent/notice flows should be event-configurable within policy constraints.

### 15. Archive the event

Finished events remain useful: final standings, activity results, submissions (subject to retention/privacy settings), statistics, awards, and reports should remain viewable to authorized users.

## Product boundaries for V1 philosophy

The platform can be broad without implementing every possible renderer on day one. The architecture must be extensible from day one; the feature set can grow by phases.

The correct question is not “Can V1 play every game?” The correct question is “Can adding a new game avoid rewriting the platform?”

