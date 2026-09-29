# Phase 8 Handoff — Participant PWA, Offline Resilience & Media

Phase 7 completes the competitive interpretation layer. Phase 8 should focus on field-ready participant experience and connectivity resilience.

## Priorities

- mobile-first participant shell;
- team-code/guest join refinement;
- clear current mission / next checkpoint UX;
- participant-safe live progress and score visibility according to event policy;
- optional installable PWA manifest/service worker;
- offline read cache for current route/task;
- durable client mutation queue with idempotency keys;
- reconnect/sync conflict messaging;
- media capture/upload persistence;
- image/video compression and retry strategy;
- media moderation/gallery rules;
- public/projector scoreboard using Phase 7 leaderboard definitions/snapshots;
- live announcements in the participant shell;
- accessibility and low-bandwidth modes.

## Do not do

- Do not move scoring authority into the client.
- Do not expose answer keys/full randomized question banks in offline caches.
- Do not invent a second leaderboard model for projector mode; consume the Phase 7 result contracts.
- Do not make PWA installation mandatory.
- Do not sacrifice ordinary camera-app QR deep links just because an installed PWA exists.
