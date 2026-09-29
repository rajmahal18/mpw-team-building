# Phase 3 Repository Contract

When repository creation begins, the implementation must preserve the Phase 1 constitution and Phase 2 contracts.

## 1. Tech direction

Recommended baseline:

- Next.js App Router;
- TypeScript strict mode;
- PostgreSQL;
- Prisma;
- Zod shared contracts;
- server-owned authorization/scoring;
- mobile-first responsive web/PWA foundation;
- object storage abstraction for media later;
- test runner with unit + integration coverage for domain primitives.

No frontend visual polish requirement yet beyond usable, accessible structure.

## 2. Suggested source boundaries

```text
src/
  app/                       # routes/surfaces
  domain/
    event/
    identity/
    team/
    activity/
    question/
    station/
    route/
    scoring/
    competition/
    audit/
  engine/
    blocks/
    rules/
    scoring/
    competitions/
    randomization/
    validation/
  server/
    auth/
    permissions/
    services/
    repositories/
    transactions/
  schemas/
    event/
    activity/
    question/
    rule/
    scoring/
  ui/                        # semantic components; visual system later
  lib/
```

Do not organize business logic primarily by pages.

## 3. Registry layout

Each extensible registry should have:

```text
engine/blocks/<type>/
  schema.ts
  server.ts
  tests.ts
  ui-organizer.tsx          # when builder phase arrives
  ui-participant.tsx        # when participant phase arrives
```

Equivalent structure for rule actions, score operators, and competition formats where useful.

## 4. Mandatory shared schemas

Phase 3 should implement at minimum:

- `EventConfigSchema`
- `ActivityDefinitionSchema`
- `ParticipationPolicySchema`
- initial `ActivityBlockSchema` union
- `MetricDefinitionSchema`
- `TimingPolicySchema`
- `VerificationPolicySchema`
- `RuleDefinitionSchema`
- `ConditionExprSchema`
- `ScoreExprSchema`
- `ScoringDefinitionSchema`

Persist JSON only after validation.

## 5. Domain services, not fat route handlers

Expected services:

- EventLifecycleService
- EventPreflightService
- ActivityDefinitionService
- ActivityRunService
- SubmissionService
- VerificationService
- MetricService
- ScoringService
- RuleEngineService
- RouteService
- StationService
- CompetitionService
- AuditService
- RandomizationService

UI/API layers call services; they do not own domain rules.

## 6. Security contract

- authorization on server for every mutation;
- separate public/protected projections for definitions/questions;
- no correct-answer data serialized to participant responses;
- signed/random opaque QR tokens;
- idempotency for critical mutations;
- validate all JSON configs server-side;
- never execute organizer-provided code.

## 7. Database contract

- relational core models;
- immutable published version rows;
- append-oriented audit/score history;
- indices for event/live operational queries;
- transaction boundaries for result + score + outbox where necessary;
- no destructive cascade that erases historical competitive/audit data.

## 8. Testing contract

Every engine primitive requires:

1. schema validation tests;
2. authorization/server behavior tests where applicable;
3. serialization/projection tests;
4. at least **two materially different activity examples**;
5. malformed config rejection tests;
6. historical/version behavior tests if it affects published definitions.

Specific architecture tests:

- MCQ works with 2, 3, 7+ choices;
- event works with arbitrary team count;
- activity can be non-scored;
- same duration metric supports two unrelated physical games;
- same judge rubric primitive supports two creative tasks;
- same tournament plugin works with two different head-to-head activities;
- duplicate submission retry does not double-score;
- answer key absent from participant projection;
- completed run remains pinned to old definition after hotfix.

## 9. AGENTS.md rule for repo root

Copy/adapt the Phase 1 `AGENTS.md` into the repository root and add:

> Phase 2 schemas and invariants are architectural contracts. Do not simplify them into event-specific structures for implementation convenience.

## 10. Frontend deferral

Phase 3 should build only enough UI to exercise and verify the multi-event core. Avoid spending time on:

- final color system;
- premium typography;
- motion language;
- decorative dashboards;
- elaborate landing page;
- final MPW visual branding.

However, do not create frontend architecture that blocks later theming. Semantic tokens and event branding data should already exist.

## 11. Phase 3 first vertical slice

Recommended proof slice:

1. create event;
2. create arbitrary teams/participants;
3. create one blank custom activity instance;
4. save validated definition JSON;
5. publish immutable activity definition version;
6. create participation entry;
7. start an activity run;
8. submit one generic block;
9. record one metric;
10. compute one derived score;
11. audit the consequential actions.

Once this works without naming a specific game, the foundation is credible.
