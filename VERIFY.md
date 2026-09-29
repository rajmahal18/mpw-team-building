# Verification

This source package may not have `node_modules` in the execution environment. Run on a normal networked development machine from the repository root:

```bash
npm install
npm run db:generate
npm run typecheck
npm test
npm run build
```

Then validate PostgreSQL:

```bash
cp .env.example .env
npm run db:migrate -- --name phase8
npm run db:seed
npm run dev
```

## Phase 6/7 competitive smoke test

1. Sign in as the seeded organizer.
2. Create or use several teams with uneven roster sizes.
3. Create stations and routes, assign teams, and verify signed checkpoint QR flow.
4. Confirm station capacity sends overflow teams into FIFO queue and marshal completion can call the next team.
5. Build two materially different activities: one lower-is-better timed activity and one higher-is-better quantity/judged activity.
6. Record metrics/submissions and verify derived ScoreEntry rows are append-only.
7. In **Scores**, convert activity ranking into arbitrary placement points.
8. Re-run placement conversion with changed rules; verify prior placement rows receive reversal rows instead of being deleted.
9. Add an event-level bonus and penalty with reasons; reverse one and verify audit history remains.
10. Create a leaderboard with multiple sources, different weights and optional activity filters.
11. Test BEST/LATEST/SUM/AVERAGE attempts, BEST_N and DROP_LOWEST_N across activities.
12. Add tie-breakers; verify equal totals follow the configured chain and declared ties share rank.
13. Save a PROVISIONAL snapshot, change a score, then save a FINAL snapshot; verify both revisions remain immutable.
14. Create a round robin with arbitrary teams; record wins/draws/scores and verify standings.
15. Create single elimination with a non-power-of-two entrant count; verify byes and automatic winner advancement.
16. Try correcting an elimination result after the next round exists; verify the service refuses silent bracket corruption.
17. Finalize competitions only after all matches are resolved.

## Static architecture checks

```bash
grep -RniE 'if .*activity.*(quiz|race|sack|relay)|choiceA|choiceB|choiceC|choiceD|teamCount === [1-9]|firstPlacePoints|secondPlacePoints|thirdPlacePoints' src prisma || true
```

Review any match. Test fixtures/docs are allowed to contain examples; runtime business logic must not branch on them.

## Environment note

If dependency installation is unavailable, a useful partial syntax check is:

```bash
tsc --noEmit --pretty false 2>&1 | tee /tmp/mpw-tsc.log
grep -E 'error TS1[0-9]{3}:' /tmp/mpw-tsc.log
```

No TS1xxx parser diagnostics should remain. Module/JSX type errors are expected when `node_modules` and generated Prisma client are absent.


## Phase 8 participant/PWA smoke test

1. Join an event using only a team code; confirm no personal account is required.
2. Open a checkpoint QR with the normal phone camera and verify unauthenticated users return to the same checkpoint after joining.
3. Open a mixed activity containing a randomized question pool, fill/text, number, ordering/matching and media proof; confirm only selected bank questions are visible.
4. Switch the browser offline, submit multiple answers, and verify the status bar shows durable pending mutations.
5. Refresh/open `/offline`; verify the last safe event/activity snapshot is readable and does not expose answer keys.
6. Restore connectivity or press Sync; verify each queued mutation is delivered once and the queue clears.
7. Simulate a permanent 4xx submission failure; verify it becomes blocked/visible instead of infinite retry.
8. Queue an image proof offline, close/reopen the page, reconnect, and verify the Blob persists and uploads.
9. Interrupt a media upload after the server stores it; retry and verify SHA-256 deduplication reuses the asset rather than creating a duplicate.
10. For a marshal-reviewed media block, verify the submission remains NEEDS_REVIEW until moderation.
11. Approve/reject/hide participant media from **Media** and verify audit history and gallery visibility.
12. Enable low-data mode; verify participant images are compressed more aggressively and optional media display is reduced.
13. Verify PUBLIC, PARTICIPANTS and STAFF_ONLY leaderboard policies, score hiding/top-only, delayed/final snapshots, and `?projector=1`.
14. Reuse the same browser for another team session and confirm the service worker does not serve the prior team's personalized HTML.
15. Confirm the normal browser experience works without installing the PWA.

## Phase 8 offline-cache guard

```bash
grep -RniE 'PAGE_CACHE|cache\.put\(request.*[/]e[/]' public/sw.js || true
```

The service worker may cache static assets, but personalized event navigation must stay network-first with `/offline` fallback.

## Phase 9 government-hardening smoke test

1. Set production `RATE_LIMIT_SECRET` and `QR_SIGNING_SECRET` to high-entropy secrets.
2. Run `npm run db:migrate` and confirm the new privacy/security/export models migrate cleanly.
3. Seed and sign in; verify the organizer root exposes **Security & privacy**.
4. Publish a privacy notice and confirm the public event privacy page shows the versioned notice.
5. Create a PIA, set a review date, and verify approval is audited.
6. Create a security incident; move it OPEN -> CONTAINED -> RESOLVED -> CLOSED and verify each transition remains in the audit log.
7. Register a data-subject request; move it through VERIFYING/IN_REVIEW/fulfilled or denied and verify history.
8. Start and complete a backup evidence record; separately perform a real restore drill using `docs/phase9/BACKUP_RESTORE_RUNBOOK.md`.
9. Configure an event retention period, finalize/archive the event, preview eligible records, and run the controlled purge. Confirm audit/final-result/history records remain.
10. Attempt login brute force and team-code brute force; verify HTTP/action rate limiting stops repeated attempts.
11. Attempt participant submission/media POST with a mismatched `Origin`; verify it is rejected.
12. Attempt to access another event's media using only a participant session; verify authorization fails.
13. Verify PUBLIC approved media works anonymously, EVENT_ONLY requires an event participant session, and STAFF_ONLY requires event review capability.
14. Download participant, score, station, audit and leaderboard CSVs; verify each request creates an `ExportJob` and audit entry.
15. Put a value beginning with `=`, `+`, `-` or `@` into a participant/team name and verify CSV output prefixes it with an apostrophe to prevent spreadsheet formula injection.
16. Inspect response headers in production and verify HSTS, `nosniff`, frame denial, referrer policy, permissions policy and CSP report-only are present.
17. Test keyboard-only navigation, skip link, reduced motion and 320px/200% zoom flows.
18. Confirm the DPO/agency has reviewed PIA, privacy notice, retention schedule, DPS/DPO registration determination, incident process and backup/restore evidence before production.

## Phase 9 static checks

```bash
# Generic-engine hardcoding guard
grep -RniE 'if .*activity.*(quiz|race|sack|relay)|choiceA|choiceB|choiceC|choiceD|teamCount === [1-9]|firstPlacePoints|secondPlacePoints|thirdPlacePoints' src prisma || true

# Prisma usage must have a schema model
# (use the Python check from the phase handoff or regenerate Prisma client after migration)

# Secret pattern scan
grep -RniE 'BEGIN (RSA|OPENSSH) PRIVATE KEY|AKIA[0-9A-Z]{16}' src prisma || true
```

The local `.env.example` contains placeholder development credentials only. Production secrets must never be copied into the repository.

## Phase 9 post-audit checks (v0.9.1)

Before production deployment, run these with dependencies installed and a disposable PostgreSQL database:

```bash
npm ci # or npm install if no lockfile has been committed yet
npm run db:generate
npm run typecheck
npm test
npm run build
npm run db:deploy
```

Then verify:

- a second event cannot reuse an existing public event slug;
- disabled staff cannot create a new session;
- participant join is refused outside joinable event lifecycle states;
- submissions/uploads are refused unless the event is LIVE and the run is IN_PROGRESS;
- unsupported upload MIME types (especially HTML/SVG) are rejected;
- exported leaderboard IDs are constrained to the authorized event;
- retention purge succeeds on events that contain media linked to participant sessions;
- privacy/incident/DSR/backup/retention mutations reject IDs from another organization;
- a clean database can be created through `prisma migrate deploy` using the Phase 9 baseline;
- backup + restore is tested separately before production use.

## Phase 10 / v1.0 productization checks

- [ ] Organizer home shows event cards, state badges, create-event workflow and security/privacy entry without horizontal overflow at 320px.
- [ ] Event workspace navigation marks the current section and keeps Engine Lab visually secondary.
- [ ] Event branding tokens affect participant/public surfaces without changing engine behavior.
- [ ] Invalid branding color strings fall back safely instead of becoming arbitrary CSS.
- [ ] Participant join, checkpoint, activity, gallery, privacy and leaderboard routes remain usable at 320px width.
- [ ] Projector mode hides the global application header and remains readable at venue resolution.
- [ ] Keyboard focus is visible across buttons, tabs, forms and activity controls.
- [ ] Reduced-motion preference disables nonessential motion.
- [ ] `/api/health` reports Phase 10 / v1.0 metadata.
- [ ] Production image builds from `Dockerfile` after dependencies are available.
- [ ] CI release gate runs Prisma generation, typecheck, Vitest and production build.
- [ ] Real pilot findings are classified and fixed generically; no event-specific branches are introduced.
