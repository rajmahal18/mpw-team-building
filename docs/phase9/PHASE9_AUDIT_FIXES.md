# Phase 9 Audit Fixes — v0.9.1

This document records the implementation defects found during the post-Phase-9 source audit and the corrective changes applied in v0.9.1.

## Critical / high-impact fixes

- Fixed broken `RateLimitExceededError` imports so rate-limited routes can compile and return the intended response path.
- Closed a cross-event leaderboard export authorization gap by requiring the requested leaderboard to belong to the authorized event.
- Closed a stored-XSS path in participant media uploads by replacing the permissive MIME fallback with an explicit allowlist and serving generic files as attachments with a restrictive CSP.
- Fixed retention purge foreign-key order: media is removed before participant sessions that it references.
- Added participant event/run lifecycle enforcement at the service/API boundary, not just the UI.
- Added organization ownership checks to privacy, incident, data-subject-request, backup, and retention mutations to resist crafted-ID cross-organization updates.

## Authentication and session hardening

- Production staff cookies only accept a configured name when it uses the `__Host-` prefix; otherwise the secure default is used.
- Disabled staff accounts are rejected before a new session is issued.
- Participant cookie identifiers now derive from a SHA-256 hash of the full event ID rather than a short raw prefix.
- Expired participant sessions are cleaned up on access, and archived/inactive teams cannot continue using old sessions.

## Public participant surface hardening

- Event slugs are globally unique because `/e/[slug]` is a global public route.
- Event creation validates the public slug with the same machine-key rules used on update.
- Event home, activity, gallery, leaderboard, leaderboard detail, and privacy routes now enforce participant-visible lifecycle states.
- Join actions validate the submitted event ID and slug as one event, then enforce joinable lifecycle state.
- Activity submissions and media require a LIVE event and an IN_PROGRESS run.

## Audit, request, and rate-limit hardening

- Audit redaction is now case/separator-insensitive and covers common credential/key/token variants recursively.
- Incoming request IDs are accepted only when they match a bounded safe character set; otherwise a UUID is generated.
- Rate-limit cleanup now respects its limit and active keys opportunistically discard expired windows.

## Data integrity fixes

- Activity-template instantiation verifies that the selected current version belongs to that template.
- Activity-run start verifies that the selected definition version belongs to the activity instance.
- Old checkpoint lab/test code was reconciled with the current DB-backed checkpoint credential model; the lab no longer manufactures an invalid fake credential token.
- Minor route/unlock exhaustiveness and typing defects found during static validation were corrected.

## Deployment readiness

- Added a PostgreSQL Prisma baseline migration under `prisma/migrations/20260929090000_phase9_baseline/` plus `migration_lock.toml`.
- The baseline covers the current 51-model / 22-enum Phase 9 schema, including indexes, unique constraints, and foreign keys.
- This baseline is intended for fresh databases. Existing databases previously created with `prisma db push` must be reconciled before the baseline is marked/applied; do not blindly run it against populated infrastructure.

## Validation limits

A dependency-aware Next.js build and Vitest run could not be completed in the audit environment because package installation was unavailable/timed out and no `node_modules` / generated Prisma client existed. Static source, schema, import/export, migration-coverage, and archive-integrity checks were still performed. See `VERIFY.md` for the commands and production verification checklist.
