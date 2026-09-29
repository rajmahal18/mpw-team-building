# Phase 3 Architecture

## Source boundaries

```text
src/app/        HTTP/UI composition only
src/domain/     domain defaults/factories and pure domain concepts
src/schemas/    Zod configuration contracts
src/engine/     generic reusable execution primitives
src/server/     authentication, authorization and application services
src/lib/        infrastructure adapters
```

## Runtime chain

```text
Organizer-authored config
       ↓
Zod validation + preflight
       ↓
ActivityInstance
       ↓
ActivityDefinitionVersion (immutable content)
       ↓
ParticipationEntry
       ↓
ActivityRun (pins exact version)
       ↓
Submission / MetricObservation
       ↓
Generic scoring/rules
       ↓
ScoreEntry ledger + AuditLog + DomainEvent
```

## Why the architecture is game-agnostic

A physical relay and a quiz do not get separate top-level persistence models. They vary through:

- participation policy;
- blocks;
- metrics;
- timing;
- verification;
- scoring;
- declarative rules;
- competition plugin when needed.

New behavior should extend a generic registry primitive rather than branch on an activity name.

## JSON policy

JSON is accepted only for genuinely polymorphic configuration or payloads and must be validated by shared contracts before persistence. Operational entities that need identity, querying, relationships, lifecycle or historical integrity stay relational.

## Security boundaries

- participant projection removes answer keys/matchers server-side;
- staff mutations require authenticated sessions and capabilities;
- password/team-code material is scrypt-hashed;
- opaque session tokens are hashed before storage;
- organizer formulas are AST data, never executable code;
- run history pins immutable definition versions;
- critical repeatable writes use idempotency keys.
