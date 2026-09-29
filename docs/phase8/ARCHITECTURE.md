# Phase 8 Architecture

## Field reliability principle

A successful HTTP response is not the definition of a successful participant action.

The participant client first persists a mutation locally, then attempts delivery. The server uses idempotency/deduplication so replay is safe.

```text
Participant action
      |
      v
IndexedDB durable outbox
      |
      +---- offline / request dies ----> remains queued
      |
      v
server mutation
      |
      v
server validation + idempotency
      |
      v
submission / media / score / audit truth
```

## Why no personalized page cache

The same URL may render different content for different team sessions because routes and random question selections can be team/run specific. Therefore the service worker caches only shell/static resources.

Offline event/activity recovery is stored as a run-aware IndexedDB snapshot instead:

```text
service worker
  -> static shell only

IndexedDB snapshot
  -> eventId
  -> team-safe event summary
  -> activityRunId
  -> participant-safe projection
  -> selected questions only
```

This avoids cross-team leakage when one physical phone/browser is reused.

## Mutation classes

### Submission mutation

Contains:
- event ID;
- activity run ID;
- block ID;
- participant-safe answer payload;
- client-generated idempotency key.

### Media submission mutation

Contains:
- same run/block identity;
- persisted Blob objects;
- idempotency key.

Upload flow:

```text
persist local files
    -> upload/dedupe assets
    -> obtain asset IDs
    -> submit block with asset IDs
    -> server accepts/review-queues submission
```

A retry of the same media file is deduplicated by run + block + SHA-256 before max-item validation, so a lost response does not create duplicate proof.

## Media authority

`MediaAsset` stores transport/storage metadata. The activity definition still owns *what media is allowed*.

```text
ActivityBlock.media_submission
  acceptedKinds
  minItems
  maxItems
  requireMarshalReview
        |
        v
MediaService validates upload
        |
        v
SubmissionService validates selected asset IDs
        |
        +-> ACCEPTED
        +-> NEEDS_REVIEW
```

Moderation changes media state and reconciles the related submission; all moderation is audited.

## Activity authorization

Opening a URL does not itself unlock an activity.

The server resolves one of these generic access paths:

1. station-assigned activity + active station visit;
2. route activity whose step is currently unlocked;
3. event-global activity with no station/route gating.

The participant then receives only the sanitized projection pinned to that run's immutable definition version and random selection.

## Low-bandwidth strategy

Low-data mode is a participant preference, not an event/game type.

- image proof is resized/compressed more aggressively;
- nonessential media display can be deferred;
- queued submissions stay usable without connectivity;
- video is not transcoded in-browser; technical upload caps constrain it.

## Leaderboard architecture

Phase 8 does not create another scoring model.

```text
Phase 7 LeaderboardDefinition
        |
        +-> LIVE: compute current standings
        +-> DELAYED: stored result revision
        +-> FINAL_ONLY: final stored result revision
        |
        v
participant/public/projector renderer
```

Visibility and score hiding/top-only policies are presentation constraints applied over the same competitive truth.

## Phase boundary

Phase 8 solves field usability and connectivity resilience. Phase 9 must harden government deployment: privacy/retention, audit viewer, reports/exports, accessibility audit, backup/recovery, security/performance testing and operational documentation.
