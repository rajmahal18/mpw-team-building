# Identity, Optional Accounts, RBAC & Capabilities

## 1. Person is not account

A human can participate without an application account.

```text
Person = reusable identity/roster record
UserAccount = authentication identity
EventParticipant = person's event-specific presence
```

`Person.userAccountId` (or a link table) is optional.

This supports organizer-imported employees and shared-team-device events without forcing 100 people through signup.

## 2. EventParticipant

Event-specific fields may include:

- event display name/nickname;
- attendance/check-in status;
- eligibility status;
- custom organizer fields;
- privacy/media preference fields where needed;
- participant category;
- notes restricted by permission.

Avoid copying unnecessary sensitive HR data into the platform.

## 3. Team membership

`TeamMembership` joins `EventParticipant` to `Team` and may store:

- member role/captain flag;
- active/reserve/absent/substitute status;
- joinedAt/leftAt;
- roster snapshot relevance.

No assumption of one fixed team size.

## 4. Authentication modes

Configurable per event:

- no individual account, shared team code/session;
- optional individual account;
- required account;
- staff accounts required while participants use team codes;
- organizer-created temporary access.

Authentication is distinct from authorization.

## 5. Capability-based permission system

Stable engine capabilities live in code. Event role names are data.

Example capabilities:

```text
event.read
event.configure
event.publish
event.lock
event.start_pause_resume
event.finalize

teams.read
teams.manage
roster.manage

activities.read
activities.manage
answer_keys.view

stations.manage
stations.operate
routes.manage

submissions.review
results.enter
results.finalize
scores.adjust
scores.override

competitions.manage
matches.officiate

announcements.send
media.review
reports.export
audit.view
roles.manage
```

## 6. Event role definition

```ts
type EventRoleDefinition = {
  id: string;
  eventId: string;
  name: string;                 // e.g. Marshal, Facilitator, Judge
  capabilities: string[];
  constraints?: {
    stationIds?: string[];
    activityIds?: string[];
    teamIds?: string[];
  };
};
```

Role labels are flexible. Capabilities are stable.

## 7. Scoped assignments

A user may be:

- judge only for Creative Chant;
- marshal only at Station 4;
- scorekeeper for all physical activities;
- event owner globally.

Permission evaluation combines capability + scope.

## 8. Participant/team authorization

Participant actions are also scoped:

- can act only for own participant identity or authorized shared team session;
- cannot submit for another team unless staff capability permits;
- station QR does not grant staff powers;
- deep links preserve intended action but still require authorization/preconditions.

## 9. Answer-key separation

Question/admin APIs should project different shapes:

- participant projection: prompt + visible choices, no correctness metadata;
- marshal projection: only what marshal needs;
- organizer editor projection: answer keys only with `answer_keys.view`.

Do not rely on frontend hiding.

## 10. Service/system actors

Audit/logging should distinguish:

- human user;
- team/participant session;
- system rule engine;
- migration/import process;
- scheduled job.

## 11. Account claiming/linking

If future reuse requires it, a user can claim/link to an existing `Person` after appropriate verification. Historical event participation remains tied to the same Person; no data migration by display-name matching.
