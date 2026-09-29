# Organizer UI/UX Coherence Patch

Goal: make the organizer experience understandable to a first-time, non-technical user without weakening the generic event engine.

## Changes

- Reworked organizer navigation into a focused primary path with secondary tools under **More**.
- Removed Engine Lab from normal organizer navigation and overview guidance.
- Strengthened global visual hierarchy, spacing, form rhythm, cards, tables, details/disclosure, mobile behavior, and sticky save feedback.
- Simplified overview copy and renamed technical "Preflight" language to a user-facing **Ready check**.
- Simplified event lifecycle actions with clearer human labels.
- Kept event setup progressive: essentials first, advanced settings collapsed, one explicit save bar.
- Simplified team creation and removed machine-key / raw asset/color fields from the normal create flow.
- Automatically generate internal machine keys for newly created teams, activities, stations, routes, library-instantiated activities, competitions, and standard leaderboards where patched.
- Simplified activity creation and made the reusable library the primary path.
- Simplified activity library wording and add-to-event flow.
- Simplified station creation to name/location first, with capacity/queue/instructions disclosed only when needed.
- Simplified route creation and removed internal identifiers from the normal surface.
- Simplified initial leaderboard creation to a standard sane default; advanced scoring tools remain available after creation.
- Removed internal machine keys from several normal organizer summaries.

## Validation

- Ran TypeScript parser-style validation on edited TS/TSX files using the globally available TypeScript compiler with dependency resolution disabled.
- No TS1xxx parser/syntax diagnostics were produced.
- Full dependency-aware build was not run because this ZIP does not contain node_modules.

Run locally / CI before production merge:

```bash
npm ci
npm run db:generate
npm run typecheck
npm test
npm run build
```
