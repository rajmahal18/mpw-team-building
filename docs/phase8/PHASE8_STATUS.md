# Phase 8 Status — Participant PWA, Offline Resilience & Media

**Status: COMPLETE**

Phase 8 turns the generic activity, field-operations, and scoring contracts into a participant-facing experience that can survive real government team-building conditions: shared phones, weak signal, camera-app QR deep links, retries, media proof, and public/projector views.

## Implemented

### Participant PWA shell

- installable web-app manifest and app icon;
- service worker for shell/static resources and `/offline` fallback;
- participant status bar with online/offline state, pending mutation count, blocked mutation count, manual sync, and low-data preference;
- team-code participant sessions remain account-optional;
- an already-joined team skips the join form and returns to the preserved event/checkpoint/activity URL;
- participant session duration is environment configuration, not an event rule hidden in code.

### Safe offline recovery

- durable IndexedDB outbox for submissions and media jobs;
- submission/media mutations receive client idempotency keys before any network attempt;
- outbox flushes on load, reconnect, focus, visibility return, or explicit Sync;
- transient failures remain queued; permanent client/auth/conflict failures become visibly blocked rather than retrying forever;
- current event/activity snapshots are persisted to IndexedDB for offline read recovery;
- snapshots are keyed to the actual event/run and stay device-local;
- the service worker deliberately does **not** cache personalized `/e/...` HTML, preventing cross-team stale-page leakage on shared devices.

Background Sync is not a correctness dependency. The normal foreground/reconnect flush path is sufficient even in browsers without Background Sync support.

### Participant activity runtime

- server-authorized route/station/global activity access;
- automatic run creation/reuse using the exact published definition version;
- participant-safe projection only;
- selected random-pool questions only;
- single choice, multi-select, fill/text, number, ordering, matching, acknowledgement, media proof and staff-action rendering;
- nested question-pool items show independent queued/synced/error state;
- run completion is derived by the server from configured completion policy;
- participant submissions remain server-scored and server-validated.

### Media proof

- generic `MediaAsset` persistence linked to event/run/block/session;
- IMAGE / VIDEO / AUDIO / FILE kinds;
- organizer-configured accepted kinds and min/max item counts are enforced;
- image compression/resizing before upload, with stronger compression in low-data mode;
- video/audio/files use size limits plus durable retry instead of unreliable browser transcoding;
- SHA-256 retry deduplication makes interrupted media upload replay safe;
- optional marshal review produces `NEEDS_REVIEW` submissions;
- organizer moderation supports pending, approved, rejected and hidden states with audit trail;
- approved event media can feed the event gallery according to event media-visibility policy.

The Phase 8 repository keeps binary media in PostgreSQL for a self-contained deployment. A future storage adapter may move blobs to S3-compatible/object storage without changing activity or submission contracts.

### Public / participant views

- participant event home shows current queue/station/next route task and announcements;
- current station activities deep-link into the participant activity runtime;
- event leaderboard pages reuse the Phase 7 leaderboard definition/snapshot engine;
- PUBLIC / PARTICIPANTS / STAFF_ONLY event visibility and board HIDDEN/FINAL_ONLY rules are honored;
- live boards may refresh automatically; delayed/final boards consume stored snapshots;
- `?projector=1` provides the projector presentation surface;
- public/event-only approved media gallery is available according to privacy configuration.

## Explicitly not claimed

- Browser Background Sync is not required and not treated as universally available.
- The PWA is not required to be installed.
- QR scanning remains compatible with the phone's normal camera app; no proprietary scanner is required.
- Browser-side video transcoding is not implemented; it is intentionally replaced by upload limits and durable retries.
- Personalized participant HTML is never put into a shared service-worker page cache.
- Phase 8 does not yet constitute the final privacy/accessibility/security certification pass; those are Phase 9 concerns.

## Persistence additions

Phase 8 adds generic media persistence and moderation primitives. The schema remains activity-name agnostic.

Current schema count after Phase 8: **41 models / 15 enums**.
