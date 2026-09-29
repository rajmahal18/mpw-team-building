# Audit & Domain Events

## 1. Two different concepts

### Audit log

Human/governance question:

> Who changed what, from what to what, when, and why?

### Domain event

Engine/integration question:

> What business event occurred that rules, notifications, projections, or jobs may react to?

Do not use one concept carelessly as the other.

## 2. Audit row

Suggested fields:

```text
AuditLog
- id
- organizationId
- eventId?
- actorType
- actorUserId?
- actorParticipantSessionId?
- action
- targetType
- targetId
- beforeJson?
- afterJson?
- metadataJson?
- reason?
- requestId?
- ipHash/technical context only if policy permits
- createdAt
```

Avoid logging secrets, answer keys in ordinary audit payloads, raw auth tokens, or unnecessary personal data.

## 3. Mandatory audit taxonomy

### Event configuration

- EVENT_CREATED
- EVENT_CONFIG_UPDATED
- EVENT_PUBLISHED
- EVENT_LOCKED
- EVENT_UNLOCKED/HOTFIX_STARTED
- EVENT_STARTED
- EVENT_PAUSED
- EVENT_RESUMED
- EVENT_FINALIZED
- EVENT_ARCHIVED
- EVENT_CANCELLED

### Teams/roster

- TEAM_CREATED/UPDATED/ARCHIVED
- PARTICIPANT_ADDED/UPDATED/REMOVED
- TEAM_MEMBERSHIP_CHANGED
- CAPTAIN_CHANGED
- LATE_SUBSTITUTION_APPLIED

### Activities/content

- ACTIVITY_ADDED/UPDATED
- ACTIVITY_VERSION_PUBLISHED
- QUESTION_VERSION_PUBLISHED
- QUESTION_BANK_IMPORT
- ROUTE_CHANGED
- STATION_CHANGED

### Runtime/results

- SUBMISSION_REVIEWED
- VERIFICATION_ACCEPTED/REJECTED
- METRIC_CORRECTED
- SCORE_BONUS_APPLIED
- SCORE_PENALTY_APPLIED
- SCORE_OVERRIDE_APPLIED
- RESULT_VOIDED
- DISPUTE_OPENED/RESOLVED
- MATCH_RESULT_CORRECTED

### Security/permissions

- ROLE_CREATED/UPDATED
- ROLE_ASSIGNMENT_CHANGED
- CAPABILITY_ASSIGNMENT_CHANGED
- ANSWER_KEY_ACCESSED (optional higher-sensitivity audit)
- EXPORT_GENERATED

## 4. Reason requirements

Require a reason for high-impact actions such as:

- score override;
- disqualification;
- voiding finalized result;
- post-lock definition change;
- manual route bypass;
- participant removal during live event;
- role/capability escalation;
- final-result correction.

## 5. Domain event envelope

```ts
type DomainEvent<T> = {
  id: string;
  type: string;
  schemaVersion: number;
  occurredAt: string;
  eventId?: string;
  aggregateType: string;
  aggregateId: string;
  correlationId: string;
  causationId?: string;
  payload: T;
};
```

## 6. Initial domain events

- `EVENT_STARTED`
- `EVENT_PAUSED`
- `STATION_CHECKED_IN`
- `STATION_QUEUE_CHANGED`
- `ACTIVITY_RUN_CREATED`
- `ACTIVITY_RUN_STARTED`
- `SUBMISSION_RECEIVED`
- `SUBMISSION_ACCEPTED`
- `ACTIVITY_RUN_COMPLETED`
- `METRIC_RECORDED`
- `SCORE_ENTRY_CREATED`
- `RESULT_FINALIZED`
- `MATCH_FINALIZED`
- `ROUTE_STEP_COMPLETED`
- `TEAM_FINISHED_EVENT`
- `INCIDENT_REPORTED`

## 7. Transactional outbox

For durable async/realtime processing later, mutations can write an OutboxEvent in the same DB transaction. Consumers mark delivery/processing separately.

Benefits:

- no “DB committed but websocket/notification event lost” gap;
- replayable projections;
- deterministic rule processing;
- future integrations without coupling core transactions.

## 8. Realtime is a projection, not authority

Websocket/SSE messages notify clients of authoritative server state. They are not themselves the system of record.
