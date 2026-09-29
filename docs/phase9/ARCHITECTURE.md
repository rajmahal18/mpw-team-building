# Phase 9 Architecture

## 1. Security layers

`browser -> HTTPS/security headers -> SameSite/HttpOnly cookie -> authenticated capability check -> rate limit -> validated input -> domain service -> Prisma transaction -> audit/domain event`

No single layer is treated as sufficient.

## 2. Authentication

Staff sessions store only a SHA-256 token hash. The raw token exists only in the HTTP-only cookie.

Participant team sessions use the same pattern. Production participant/staff cookies use `__Host-` naming, Secure, HttpOnly, SameSite=Lax and Path=/.

Sessions have bounded lifetime and last-seen refresh. Expired staff sessions are removed on access.

## 3. Authorization

Capabilities are checked server-side. UI visibility is not a security boundary.

Event capabilities now include `reports.export`. Platform capabilities include security/privacy/backup administration.

## 4. Rate limiting

The platform uses a PostgreSQL-backed window bucket keyed by a salted hash. Raw IP addresses are not persisted in the bucket.

Scopes:

- login;
- team join;
- participant submission;
- participant media;
- report export.

Limits are technical abuse controls, not game rules. They can be changed without changing activity definitions.

## 5. Audit safety

Audit records are append-only application records. The audit service recursively redacts secrets and binary payloads and truncates extremely large strings.

Never put these into audit `before` / `after` payloads:

- passwords;
- team join codes;
- session tokens;
- cookies;
- signing secrets;
- private keys;
- raw uploaded binary data.

## 6. Privacy governance

The data model separates:

- `PrivacyNotice` — versioned transparency content;
- `PrivacyImpactAssessment` — system-level privacy/risk assessment evidence;
- `DataProcessingRecord` — processing inventory foundation;
- `DataSubjectRequest` — rights-request tracking;
- `SecurityIncident` — incident/breach register;
- `BackupRun` — backup/restore evidence;
- `ExportJob` — report extraction evidence.

These records are deliberately separate from event/game configuration.

## 7. Retention

Event `privacy.retentionDays` is an organizer/agency-controlled policy input, not an arbitrary hardcoded deletion number.

The current automated purge intentionally removes only operational data whose retention period has elapsed:

- participant sessions;
- media assets;
- operational receipts;
- domain events;
- export jobs.

It intentionally does not automatically erase roster/person records, audit logs, event snapshots or final results. Those require an approved records schedule and separate retention decision.

Purging is blocked while an event is live/configuring/registration/locked. It requires a finalized, archived or cancelled event.

## 8. Reports

Exports are synchronous CSV responses in Phase 9, but every request first creates an `ExportJob` and is audited. The model can later be moved to a background object-storage job without changing report semantics.

Supported report primitives:

- participant roster;
- score ledger;
- station visits;
- audit log;
- leaderboard snapshot.

## 9. Backup

The application does not pretend to be the database backup system. `BackupRun` records evidence about external backup execution and verification.

The actual PostgreSQL/object-storage backup should be implemented at the deployment layer with encrypted storage, retention, restore tests and least-privilege credentials.

## 10. Privacy-safe media

Media access follows event policy:

- PUBLIC: approved media may be publicly served;
- EVENT_ONLY: approved media requires an active participant session for that event;
- STAFF_ONLY: requires event review capability;
- DISABLED: not exposed through participant gallery.

Rejected/hidden media never returns through the media endpoint.

## 11. Activity-engine invariant

Phase 9 must not add game-specific logic. Security/operations wrap the same generic engine:

`ActivityTemplate -> ActivityInstance -> ActivityRun -> Submission/Metric -> Score -> Leaderboard`

A new security control must remain reusable across every activity.
