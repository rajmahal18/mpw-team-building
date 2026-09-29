# Phase 6 Status — Flow, QR, Stations & Live Operations

Phase 6 was implemented directly into the working repository and is packaged together with Phase 7 rather than as a separate handoff ZIP.

## Implemented core

- generic Station records with capacity/state/config;
- station/activity assignments;
- route plans and route steps;
- FIXED, FREE, CIRCULAR and RANDOMIZED route policies;
- frozen per-team route assignment snapshots;
- signed, expiring, rotatable/revocable checkpoint credentials;
- normal phone-camera QR deep links;
- logged-in/team-session instant checkpoint flow;
- logged-out join flow that returns to the checkpoint;
- station visits tied to route steps;
- FIFO queue/capacity reservation;
- marshal station operation surface;
- idempotent call/check-in/complete/reroute mutations;
- automatic next-team call where configured;
- event pause/resume and station pause/open controls;
- congestion overview and emergency reroute;
- organizer announcements;
- live team route progress;
- audit/domain events for operational overrides.

## Deliberately deferred

Client-side offline queues, upload retries, installable PWA behavior, media persistence and public projector mode remain Phase 8 concerns. Phase 6 establishes retry-safe server operations but does not pretend a browser that is fully offline can already synchronize arbitrary mutations.
