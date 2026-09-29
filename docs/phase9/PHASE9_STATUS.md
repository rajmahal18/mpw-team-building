# Phase 9 — Government Hardening & Operational Readiness

Status: **implemented in the Phase 9 source package**.

Phase 9 hardens the platform without changing the generic activity/game engine.

## Delivered

- security response headers and production HSTS;
- CSP report-only baseline so violations can be observed before enforcement;
- hardened HTTP-only, SameSite cookies and production `__Host-` cookie names;
- bounded staff session lifetime and last-seen updates;
- stronger password creation minimum (12 characters);
- database-backed, privacy-minimized rate limiting for login, team join, participant submission, media upload, and exports;
- same-origin protection for participant state-changing API endpoints;
- request IDs on hardened API responses;
- audit redaction for passwords, tokens, secrets, cookies, authorization headers, private keys and binary payloads;
- media access enforcement aligned to PUBLIC / EVENT_ONLY / STAFF_ONLY behavior;
- versioned privacy notices and participant-facing privacy notice route;
- PIA records, approval/review dates and processing-record foundation;
- data-subject request register and status workflow;
- security incident / breach register with notification due date and status history;
- event retention preview and controlled purge for expired operational data after an event is no longer live;
- backup evidence register (start / success / failed / verified) while keeping the actual backup mechanism in infrastructure;
- CSV report/export service for participants, scores, station visits, audit logs and leaderboards;
- export audit trail and export rate limiting;
- event audit viewer and reports/export organizer surfaces;
- global Security & Privacy organizer surface;
- accessibility baseline: keyboard focus, skip link, reduced-motion support, clearer disabled state;
- Prisma reconciliation for the previously referenced ActivityTemplate / ActivityTemplateVersion models and ActivityInstance source-template relation;
- production-safe Prisma client reuse so transactions use one client consistently;
- verification/runbook documentation for backup/restore, incident response, privacy, retention, accessibility and release checks.

## Important boundary

This phase implements technical and operational controls. It does **not** declare the agency legally compliant. The DPO, records officer, information-security function, procurement/contract owners and agency head remain responsible for the applicable approvals, policies, registrations, records schedules, contracts and legal determinations.

## Current regulatory basis used for the architecture

As of this phase, the primary privacy-security baseline is NPC Circular No. 2023-06, which applies to government and private-sector processing and expressly superseded NPC Circular No. 16-01. The NPC's current materials describe privacy-by-design/default, PIA, access controls, security measures and business continuity as part of the updated framework.

NPC Advisory No. 2025-02 further provides privacy-engineering guidance across systems life-cycle processes. The repository therefore treats privacy requirements as engineering inputs rather than a post-launch document exercise.

NPC Circular No. 16-03 remains the breach-management reference used for the incident-response workflow; the platform stores incident timing/evidence but does not automatically make a legal determination that a breach is mandatorily reportable.
