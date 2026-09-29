# Phase 9 Handoff — Government Hardening, Reports & Accessibility

Phase 8 makes the platform field-usable. Phase 9 should make it government-deployment-ready.

## Primary goals

### Privacy and data governance

- produce a concrete data inventory / processing map;
- expose configurable retention rules and deletion/anonymization jobs;
- media retention and consent/notice workflow;
- review event visibility and participant-name visibility end to end;
- provide a Privacy Impact Assessment implementation checklist for MPW deployment;
- ensure exported reports obey the same visibility/data-minimization rules.

### Audit and accountability

- searchable audit-log viewer;
- filters by event, actor, capability, entity and time;
- human-readable before/after or delta display where appropriate;
- exportable audit package for authorized staff;
- preserve append-only history for scoring, moderation, overrides and finalization.

### Reports / exports

Generic, configurable outputs rather than one fixed annual report:
- event summary;
- teams/roster/attendance;
- activity results;
- raw metrics;
- score ledger;
- final/provisional standings;
- station/checkpoint timeline;
- competition results;
- media inventory (metadata, not necessarily blobs);
- incident/override log;
- CSV/XLSX/PDF surfaces where appropriate.

### Accessibility

- keyboard/focus audit;
- screen-reader labels and live regions;
- contrast/zoom/reflow review;
- reduced-motion compatibility;
- error identification and form help;
- non-color-only status communication;
- 320px mobile review and large-text behavior;
- accessible alternatives for media/question types.

### Reliability / security / operations

- rate limiting and abuse controls for public/participant endpoints;
- CSRF/origin review for mutations;
- authorization matrix regression tests;
- media MIME/content validation hardening;
- database/storage quotas;
- performance tests for realistic team/event counts;
- backup + restore drill/runbook;
- deployment health checks and migration procedure;
- incident/fallback operating guide for organizers.

## Preserve these Phase 8 invariants

- Do not make PWA installation mandatory.
- Do not make Background Sync a correctness dependency.
- Do not cache personalized participant HTML in a shared service-worker page cache.
- Do not move scoring/answer validation to the client.
- Do not expose unselected random-bank questions or answer keys.
- Do not replace append-only score/audit truth with mutable summary fields.
- Do not make media storage backend part of activity semantics.
- Do not add event/game-specific hardcoding while building reports.

## Phase 9 exit condition

A reusable event can be configured, run, recovered, audited, exported, and archived under documented MPW operational procedures without relying on developer intervention for normal use.
