# Phase 9 Prisma Baseline Migration

Phase 9 v0.9.1 includes a real Prisma migration baseline:

`prisma/migrations/20260929090000_phase9_baseline/migration.sql`

## Fresh database

After configuring `DATABASE_URL` and installing dependencies:

```bash
npm run db:generate
npm run db:deploy
npm run db:seed
```

The baseline is designed to materialize the full current schema on a fresh PostgreSQL database.

## Existing database

If the environment was already created with `prisma db push` or manual SQL, do **not** blindly execute the baseline. First compare the live schema with `prisma/schema.prisma`, reconcile any drift, back up the database, and then use Prisma's migration-resolution workflow only after the database is confirmed equivalent to the baseline.

A migration file being present does not replace a restore test or a deployment rehearsal against a staging copy of production data.
