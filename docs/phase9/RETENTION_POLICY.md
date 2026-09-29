# Retention Policy Implementation

## Principle

Do not invent a universal retention period in application code. The agency's approved records schedule and privacy assessment determine how long each data class should be retained.

## Current event control

`Event.configJson.privacy.retentionDays` provides a configurable event-level operational retention input.

The Phase 9 purge is intentionally conservative and only removes expired operational data after the event is finalized, archived or cancelled.

### Eligible for current purge

- participant session tokens/records;
- media assets;
- operational receipts/idempotency records;
- domain events;
- expired export jobs.

### Not automatically purged

- Person/roster records;
- EventParticipant records;
- AuditLog;
- EventSnapshot;
- final scores/result snapshots;
- activity definitions;
- competition history.

These may have administrative, historical, legal, procurement, or records-management value and need an explicit approved schedule before automated deletion.

## Before enabling automated purge

- approve the records schedule;
- confirm the PIA and privacy notice;
- confirm backup retention;
- confirm legal-hold handling;
- confirm the agency's disposal procedure;
- test restore and audit evidence.
