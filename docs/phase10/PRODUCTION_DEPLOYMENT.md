# Production Deployment Gate

1. Use Node 22 or newer.
2. Configure a production PostgreSQL database and all secrets from `.env.example` with generated random values.
3. Set `APP_ORIGIN` to the exact HTTPS deployment origin.
4. Install dependencies from the lockfile/dependency manifest used by the deployment environment.
5. Run `npm run db:generate`.
6. Run `npm run typecheck`.
7. Run `npm test`.
8. Run `npm run build`.
9. Apply `npm run db:deploy` against a disposable production-like database first, then production.
10. Seed only when explicitly required; never ship the sample seed password.
11. Verify `/api/health` and an authenticated `/api/health?deep=1`.
12. Exercise login, event setup, participant join, checkpoint QR, submission/media, scoring, leaderboard, exports and audit trails.
13. Confirm backup creation and a restore drill before the event.

Do not treat a successful frontend render as deployment acceptance. Database migration, security, participant operations and restore capability are separate gates.
