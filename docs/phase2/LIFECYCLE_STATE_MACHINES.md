# Lifecycle State Machines

State transitions are server-authoritative, permissioned, and auditable.

## 1. Event lifecycle

```text
DRAFT
  -> CONFIGURING
  -> REGISTRATION_OPEN
  -> READY
  -> LOCKED
  -> LIVE
  <-> PAUSED
  -> RESULTS_REVIEW
  -> FINALIZED
  -> ARCHIVED

Any pre-final state may -> CANCELLED where policy allows.
```

### Key semantics

- `DRAFT`: skeletal event may be incomplete.
- `CONFIGURING`: organizers actively build teams/activities/routes.
- `REGISTRATION_OPEN`: participant/team joining may occur.
- `READY`: preflight passes but content may still be changed.
- `LOCKED`: competitive definitions/snapshots frozen.
- `LIVE`: runtime mutations allowed according to schedule/rules.
- `PAUSED`: participant progression paused globally; staff may resolve issues.
- `RESULTS_REVIEW`: gameplay ended, disputes/review ongoing.
- `FINALIZED`: official results locked by authorized role.
- `ARCHIVED`: operationally closed/read-oriented.

## 2. Activity definition lifecycle

```text
DRAFT -> READY -> PUBLISHED
                 -> SUPERSEDED
                 -> RETIRED
```

`ActivityDefinitionVersion` itself is immutable once published. Editing creates a new draft/version.

## 3. Activity run lifecycle

```text
CREATED
 -> ELIGIBLE
 -> IN_PROGRESS
 <-> PAUSED
 -> SUBMITTED
 -> PENDING_VERIFICATION
 -> COMPLETED
 -> FINALIZED

Alternative exits:
 -> FAILED
 -> SKIPPED
 -> CANCELLED
 -> VOID
```

Not every activity uses every intermediate state. The state machine permits transitions according to its definition and verification mode.

## 4. Submission lifecycle

```text
DRAFT_LOCAL?        // client-side only, not authoritative
RECEIVED
 -> VALIDATING
 -> ACCEPTED
 -> REJECTED
 -> NEEDS_REVIEW
 -> SUPERSEDED
 -> VOID
```

Server persistence starts at `RECEIVED`. Client offline drafts are not official submissions.

## 5. Verification lifecycle

```text
PENDING -> ACCEPTED
        -> REJECTED
        -> OVERRIDDEN
        -> VOID
```

Multiple verification decisions may exist; the policy derives effective verification state.

## 6. Result lifecycle

```text
PENDING -> PROVISIONAL -> FINAL
            |             |
            v             v
         DISPUTED      CORRECTED_REVISION
            |
            v
         PROVISIONAL/FINAL

Any invalid result may -> VOID
```

## 7. Station lifecycle

```text
DRAFT -> READY -> OPEN <-> PAUSED -> CLOSED
                       \-> DISABLED
```

`DISABLED` can be temporary/emergency depending on event operations. A fallback route may be triggered.

## 8. Station visit / queue lifecycle

```text
EXPECTED
 -> QUEUED
 -> CALLED
 -> ARRIVED
 -> ACTIVE
 -> COMPLETED

Alternative:
 -> SKIPPED
 -> NO_SHOW
 -> REROUTED
 -> CANCELLED
```

## 9. Competition lifecycle

```text
DRAFT -> SEEDED -> LIVE -> COMPLETE -> FINALIZED -> ARCHIVED
                         \-> REVIEW
```

## 10. Match lifecycle

```text
SCHEDULED -> READY -> LIVE -> PENDING_RESULT -> FINAL
                                      \-> DISPUTED
Alternative: BYE | WALKOVER | CANCELLED | VOID
```

## 11. Timer lifecycle

```text
CREATED -> RUNNING <-> PAUSED -> EXPIRED/STOPPED
```

Store authoritative timestamps/durations rather than decrementing a mutable server counter every second.

## 12. Transition requirements

Every transition definition should specify:

- allowed source states;
- required capability;
- validation/preconditions;
- domain event emitted;
- audit requirement;
- idempotency behavior;
- allowed during event state(s).

## 13. No UI-owned state

A button being hidden/disabled is not security. Every transition is validated server-side against current persisted state and caller capability.
