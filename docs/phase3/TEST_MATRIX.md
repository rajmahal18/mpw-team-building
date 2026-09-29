# Phase 3 Architecture Test Matrix

| Contract | Proof |
|---|---|
| MCQ has no fixed choice count | schema tests with 2, 3, 7, and 15 choices |
| activity may be non-scored | activity schema test |
| answer key not exposed | participant projection tests |
| same metric/scoring works across unrelated games | duration scoring test |
| judge rubric is reusable | same rubric validated for two different creative tasks |
| competition plugin is activity-agnostic | round-robin test reused for physical and knowledge head-to-head labels |
| odd competition entrants supported | BYE is structural, not emitted as fake match |
| deterministic randomization is replayable | seeded shuffle test |
| no arbitrary executable rules | typed condition/action AST tests |
| run pins historical definition | Prisma contract test |
| duplicate submit retry is idempotent | Prisma unique constraint contract test |
| no fixed A/B/C/D DB columns | Prisma contract test |

Database integration tests should be added once a test PostgreSQL database is available in CI.
