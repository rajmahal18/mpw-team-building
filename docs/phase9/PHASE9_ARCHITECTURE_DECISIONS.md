# Phase 9 Architecture Decisions

## ADR-09-01 — Current NPC security baseline

Use NPC Circular 2023-06 as the current security baseline instead of the repealed 2016-01 government circular.

## ADR-09-02 — Privacy is lifecycle architecture

PIA, privacy notice, retention, incident response and data-subject requests are first-class domain records.

## ADR-09-03 — No automatic legal determinations

The software records incident evidence and due dates but does not decide whether a breach is legally reportable or which lawful basis applies.

## ADR-09-04 — Conservative deletion

Automatic purge excludes official/historical records until an approved records schedule exists.

## ADR-09-05 — Infrastructure backup boundary

The application records backup evidence; infrastructure performs encrypted database/object-store backups and restores.

## ADR-09-06 — Report semantics stay canonical

Exports read persisted canonical ledgers/snapshots instead of recomputing game results in CSV code.

## ADR-09-07 — Rate limiting is a security primitive

Rate limits protect abuse surfaces and can change independently of event/game configuration.

## ADR-09-08 — Prisma client reuse

The application reuses one server-side Prisma client so transactions are not accidentally composed from unrelated clients in production.
