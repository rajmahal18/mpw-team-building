# Backup & Restore Runbook

## Responsibility boundary

The application records `BackupRun` evidence. Infrastructure owns the actual PostgreSQL/object-storage backup mechanism.

## PostgreSQL baseline

Use encrypted backups and a least-privilege database credential. A typical deployment can use:

```bash
pg_dump --format=custom --no-owner --no-privileges "$DATABASE_URL" > mpw-team-building-YYYYMMDD.dump
```

Store the dump outside the application host. Do not commit it to Git or upload it to the source repository.

## Restore drill

Restore into an isolated PostgreSQL instance, never directly over production:

```bash
createdb mpw_team_building_restore
pg_restore --no-owner --no-privileges --dbname="$RESTORE_DATABASE_URL" mpw-team-building-YYYYMMDD.dump
```

Then run:

```bash
npm run db:generate
npm run typecheck
npm test
npm run build
```

and execute the field/organizer smoke tests in `VERIFY.md`.

## Evidence to record

For each backup drill record:

- backup type;
- backup reference/location;
- creation timestamp;
- checksum where applicable;
- size;
- restore timestamp;
- restore success/failure;
- verification owner;
- observed RPO/RTO;
- corrective actions.

## Minimum release requirement

A production release is not “backup-ready” merely because a backup exists. A restore must be tested and the result recorded.
