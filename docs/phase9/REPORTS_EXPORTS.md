# Reports & Exports

## Available CSV reports

- Participants — roster, team, role, join/check-in status;
- Scores — append-only score ledger;
- Stations — station visit lifecycle;
- Audit — event audit trail;
- Leaderboard — latest saved leaderboard snapshot.

## Rules

- exports require server-side `reports.export` capability;
- export requests are rate-limited;
- each request creates an `ExportJob` and an audit record;
- exports use the canonical persisted records, not browser-calculated totals;
- leaderboard exports use an immutable snapshot;
- exports are no-store responses;
- raw answer keys are never included by the export service.

## Future extension

The same service can later generate XLSX/PDF asynchronously through an object-storage job without changing the domain semantics.
