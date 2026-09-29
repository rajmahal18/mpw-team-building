# Deployment Automation

Phase 10 includes provider-neutral automation rather than hardcoding one cloud vendor.

- `next.config.ts` emits a standalone production server.
- `Dockerfile` builds a non-root Node 22 runtime image with an HTTP healthcheck.
- `.github/workflows/ci.yml` runs Prisma generation, TypeScript, Vitest and the production build on pull requests and `main` pushes.
- `npm run verify:release` provides the same local release gate.

Database migrations remain an explicit deployment step (`npm run db:deploy`) so schema mutation is not hidden inside application startup.
