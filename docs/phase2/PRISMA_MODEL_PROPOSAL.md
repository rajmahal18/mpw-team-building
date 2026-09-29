# Prisma Model Proposal

> This is a persistence proposal for Phase 3, not a final copy-paste schema. Names can be refined during repo initialization, but the **domain boundaries and no-hardcoding constraints should remain**.

## 1. Database principles

- PostgreSQL.
- UUID/CUID-style opaque IDs.
- Timestamps in UTC; event timezone stored separately.
- JSON only where the structure is validated by shared schemas and genuinely polymorphic.
- Relational rows for objects that need querying, integrity, ownership, lifecycle, audit, or aggregation.
- Soft/archive semantics where history is referenced; avoid destructive delete of live/history data.
- Composite unique constraints for idempotency and machine keys.

## 2. Proposed enums

```prisma
enum EventState {
  DRAFT
  CONFIGURING
  REGISTRATION_OPEN
  READY
  LOCKED
  LIVE
  PAUSED
  RESULTS_REVIEW
  FINALIZED
  ARCHIVED
  CANCELLED
}

enum ActivityRunState {
  CREATED
  ELIGIBLE
  IN_PROGRESS
  PAUSED
  SUBMITTED
  PENDING_VERIFICATION
  COMPLETED
  FINALIZED
  FAILED
  SKIPPED
  CANCELLED
  VOID
}

enum SubmissionStatus {
  RECEIVED
  VALIDATING
  ACCEPTED
  REJECTED
  NEEDS_REVIEW
  SUPERSEDED
  VOID
}

enum VerificationStatus {
  PENDING
  ACCEPTED
  REJECTED
  OVERRIDDEN
  VOID
}

enum ResultStatus {
  PENDING
  PROVISIONAL
  DISPUTED
  FINAL
  VOID
}

enum ParticipationEntryKind {
  TEAM
  INDIVIDUAL
  PAIR
  SUBGROUP
  AD_HOC
}

enum ScoreEntryType {
  DERIVED
  BONUS
  PENALTY
  MANUAL
  OVERRIDE_DELTA
  REVERSAL
}

enum ActorType {
  USER
  PARTICIPANT_SESSION
  SYSTEM
  IMPORT
  JOB
}
```

## 3. Organization / identity

```prisma
model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  people    Person[]
  events    Event[]
}

model UserAccount {
  id        String   @id @default(cuid())
  email     String?  @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  personLinks PersonAccountLink[]
  roleAssignments EventRoleAssignment[]
}

model Person {
  id             String   @id @default(cuid())
  organizationId String
  displayName    String
  externalKey    String?
  metadataJson   Json?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  archivedAt     DateTime?

  organization   Organization @relation(fields: [organizationId], references: [id])
  accounts       PersonAccountLink[]
  participations EventParticipant[]

  @@unique([organizationId, externalKey])
  @@index([organizationId, displayName])
}

model PersonAccountLink {
  personId      String
  userAccountId String
  verifiedAt    DateTime?
  createdAt     DateTime @default(now())

  person        Person      @relation(fields: [personId], references: [id])
  userAccount   UserAccount @relation(fields: [userAccountId], references: [id])

  @@id([personId, userAccountId])
  @@unique([userAccountId])
}
```

`externalKey` may be an MPW roster identifier only if legitimate and needed. Do not use sensitive HR identifiers casually.

## 4. Event

```prisma
model Event {
  id              String     @id @default(cuid())
  organizationId  String
  name            String
  shortName       String?
  slug            String
  timezone        String
  state           EventState @default(DRAFT)
  startsAt        DateTime?
  endsAt          DateTime?
  configJson      Json
  brandingJson    Json?
  currentSnapshotId String?
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  archivedAt      DateTime?

  organization    Organization @relation(fields: [organizationId], references: [id])
  participants    EventParticipant[]
  teams           Team[]
  stations        Station[]
  activities      ActivityInstance[]
  snapshots       EventSnapshot[]
  roles           EventRole[]
  audits          AuditLog[]
  participationEntries ParticipationEntry[]

  @@unique([organizationId, slug])
  @@index([organizationId, state])
}

model EventSnapshot {
  id          String   @id @default(cuid())
  eventId     String
  sequence    Int
  snapshotJson Json
  checksum    String
  reason      String?
  createdById String?
  createdAt   DateTime @default(now())

  event       Event    @relation(fields: [eventId], references: [id])

  @@unique([eventId, sequence])
  @@unique([eventId, checksum])
}
```

## 5. Event participants and teams

```prisma
model EventParticipant {
  id          String   @id @default(cuid())
  eventId     String
  personId    String
  displayName String?
  status      String
  metadataJson Json?
  joinedAt    DateTime?
  checkedInAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  event       Event  @relation(fields: [eventId], references: [id])
  person      Person @relation(fields: [personId], references: [id])
  teamMemberships TeamMembership[]
  entryMemberships ParticipationEntryMember[]

  @@unique([eventId, personId])
  @@index([eventId, status])
}

model Team {
  id          String   @id @default(cuid())
  eventId     String
  machineKey  String
  name        String
  abbreviation String?
  colorToken  String?
  logoAssetId String?
  status      String
  metadataJson Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  event       Event @relation(fields: [eventId], references: [id])
  memberships TeamMembership[]

  @@unique([eventId, machineKey])
  @@index([eventId, status])
}

model TeamMembership {
  id                 String   @id @default(cuid())
  teamId             String
  eventParticipantId String
  roleKey            String?
  status              String
  joinedAt            DateTime @default(now())
  leftAt              DateTime?

  team                Team             @relation(fields: [teamId], references: [id])
  participant         EventParticipant @relation(fields: [eventParticipantId], references: [id])

  @@unique([teamId, eventParticipantId])
  @@index([eventParticipantId])
}
```

`colorToken` is data, not a hardcoded palette decision. Later UI resolves safe colors/theme tokens.

## 6. Participation entries

```prisma
model ParticipationEntry {
  id          String @id @default(cuid())
  eventId     String
  kind        ParticipationEntryKind
  teamId      String?
  label       String?
  metadataJson Json?
  createdAt   DateTime @default(now())

  event       Event @relation(fields: [eventId], references: [id])
  members     ParticipationEntryMember[]
  activityRuns ActivityRun[]
  matchSides  MatchSide[]

  @@index([eventId, kind])
  @@index([teamId])
}

model ParticipationEntryMember {
  entryId            String
  eventParticipantId String
  roleKey            String?
  createdAt          DateTime @default(now())

  entry               ParticipationEntry @relation(fields: [entryId], references: [id])
  participant         EventParticipant    @relation(fields: [eventParticipantId], references: [id])

  @@id([entryId, eventParticipantId])
}
```

Application invariant: a `TEAM` entry may reference `teamId`; `INDIVIDUAL` has exactly one member; pair/subgroup size rules are definition-driven.

## 7. Roles and capabilities

```prisma
model EventRole {
  id            String @id @default(cuid())
  eventId       String
  name          String
  machineKey    String
  capabilities  Json
  scopePolicyJson Json?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  event         Event @relation(fields: [eventId], references: [id])
  assignments   EventRoleAssignment[]

  @@unique([eventId, machineKey])
}

model EventRoleAssignment {
  id            String @id @default(cuid())
  eventRoleId   String
  userAccountId String
  scopeJson     Json?
  createdAt     DateTime @default(now())
  revokedAt     DateTime?

  role          EventRole   @relation(fields: [eventRoleId], references: [id])
  userAccount   UserAccount @relation(fields: [userAccountId], references: [id])

  @@index([userAccountId])
}
```

Capabilities are validated against a code-owned registry. Role names are event data.

## 8. Activity templates and versions

```prisma
model ActivityTemplate {
  id             String @id @default(cuid())
  organizationId String?
  machineKey     String
  name           String
  categoryTags   Json
  isActive       Boolean @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  versions       ActivityTemplateVersion[]

  @@index([organizationId, isActive])
}

model ActivityTemplateVersion {
  id             String @id @default(cuid())
  templateId     String
  version        Int
  schemaVersion  Int
  definitionJson Json
  checksum       String
  publishedAt    DateTime?
  createdAt      DateTime @default(now())

  template       ActivityTemplate @relation(fields: [templateId], references: [id])

  @@unique([templateId, version])
  @@unique([templateId, checksum])
}
```

## 9. Event activities and immutable definitions

```prisma
model ActivityInstance {
  id                      String @id @default(cuid())
  eventId                 String
  machineKey              String
  displayName             String
  sourceTemplateId        String?
  sourceTemplateVersionId String?
  currentDefinitionVersionId String?
  status                  String
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
  archivedAt              DateTime?

  event                   Event @relation(fields: [eventId], references: [id])
  definitions             ActivityDefinitionVersion[]
  runs                    ActivityRun[]
  competition             Competition?

  @@unique([eventId, machineKey])
  @@index([eventId, status])
}

model ActivityDefinitionVersion {
  id               String @id @default(cuid())
  activityInstanceId String
  version          Int
  schemaVersion    Int
  definitionJson   Json
  checksum         String
  publishedAt      DateTime?
  publishedById    String?
  reason           String?
  createdAt        DateTime @default(now())

  activity         ActivityInstance @relation(fields: [activityInstanceId], references: [id])
  runs             ActivityRun[]

  @@unique([activityInstanceId, version])
  @@unique([activityInstanceId, checksum])
}
```

## 10. Questions and banks

```prisma
model QuestionBank {
  id             String @id @default(cuid())
  organizationId String?
  name           String
  machineKey     String
  tagsJson       Json?
  isActive       Boolean @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  questions      Question[]

  @@index([organizationId, isActive])
}

model Question {
  id             String @id @default(cuid())
  bankId         String
  machineKey     String
  status         String
  currentVersionId String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  bank           QuestionBank @relation(fields: [bankId], references: [id])
  versions       QuestionVersion[]

  @@unique([bankId, machineKey])
}

model QuestionVersion {
  id             String @id @default(cuid())
  questionId     String
  version        Int
  type           String
  schemaVersion  Int
  publicConfigJson Json
  protectedConfigJson Json?
  checksum       String
  publishedAt    DateTime?
  createdAt      DateTime @default(now())

  question       Question @relation(fields: [questionId], references: [id])

  @@unique([questionId, version])
  @@unique([questionId, checksum])
}
```

`protectedConfigJson` contains answer keys/accepted answers and is never returned to ordinary participant APIs.

## 11. Stations and routes

```prisma
model Station {
  id          String @id @default(cuid())
  eventId     String
  machineKey  String
  name        String
  status      String
  capacity    Int?
  configJson  Json
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  event       Event @relation(fields: [eventId], references: [id])
  assignments StationActivityAssignment[]
  visits      StationVisit[]

  @@unique([eventId, machineKey])
}

model StationActivityAssignment {
  stationId         String
  activityInstanceId String
  orderIndex        Int?
  configJson        Json?

  station           Station @relation(fields: [stationId], references: [id])
  activity          ActivityInstance @relation(fields: [activityInstanceId], references: [id])

  @@id([stationId, activityInstanceId])
}

model RoutePlan {
  id          String @id @default(cuid())
  eventId     String
  machineKey  String
  name        String
  strategy    String
  configJson  Json
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  steps       RouteStep[]
  assignments TeamRouteAssignment[]

  @@unique([eventId, machineKey])
}

model RouteStep {
  id                 String @id @default(cuid())
  routePlanId        String
  stepKey            String
  orderIndex         Int?
  stationId          String?
  activityInstanceId String?
  configJson         Json?

  routePlan          RoutePlan @relation(fields: [routePlanId], references: [id])

  @@unique([routePlanId, stepKey])
  @@index([routePlanId, orderIndex])
}

model TeamRouteAssignment {
  id          String @id @default(cuid())
  routePlanId String
  teamId      String
  snapshotJson Json?
  assignedAt  DateTime @default(now())

  routePlan   RoutePlan @relation(fields: [routePlanId], references: [id])

  @@unique([routePlanId, teamId])
}
```

Some omitted relations should be added explicitly in final Prisma schema; this document focuses on model boundaries.

## 12. Runtime activity runs

```prisma
model ActivityRun {
  id                        String @id @default(cuid())
  eventId                   String
  activityInstanceId        String
  activityDefinitionVersionId String
  participationEntryId      String
  attemptNo                 Int
  roundKey                  String?
  matchId                   String?
  state                     ActivityRunState
  generatedContentJson      Json?
  startedAt                 DateTime?
  submittedAt               DateTime?
  completedAt               DateTime?
  finalizedAt               DateTime?
  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt

  activity                  ActivityInstance @relation(fields: [activityInstanceId], references: [id])
  definition                ActivityDefinitionVersion @relation(fields: [activityDefinitionVersionId], references: [id])
  entry                     ParticipationEntry @relation(fields: [participationEntryId], references: [id])
  submissions               Submission[]
  metrics                   MetricObservation[]
  scoreEntries              ScoreEntry[]
  verifications             VerificationDecision[]

  @@unique([activityInstanceId, participationEntryId, attemptNo, roundKey])
  @@index([eventId, state])
  @@index([activityInstanceId, state])
}
```

If `roundKey` nullable uniqueness semantics become awkward in PostgreSQL/Prisma, use a normalized non-null execution key.

## 13. Submissions / verification

```prisma
model Submission {
  id             String @id @default(cuid())
  activityRunId  String
  targetKey      String
  payloadJson    Json
  status         SubmissionStatus
  idempotencyKey String?
  clientSubmittedAt DateTime?
  serverReceivedAt  DateTime @default(now())
  supersedesId   String?

  run            ActivityRun @relation(fields: [activityRunId], references: [id])

  @@unique([activityRunId, idempotencyKey])
  @@index([activityRunId, targetKey])
  @@index([status, serverReceivedAt])
}

model VerificationDecision {
  id             String @id @default(cuid())
  activityRunId  String
  submissionId   String?
  status         VerificationStatus
  actorUserId    String?
  actorRoleKey   String?
  reason         String?
  metadataJson   Json?
  createdAt      DateTime @default(now())

  run            ActivityRun @relation(fields: [activityRunId], references: [id])

  @@index([activityRunId, status])
}
```

## 14. Metrics and score ledger

```prisma
model MetricObservation {
  id             String @id @default(cuid())
  activityRunId  String
  metricKey      String
  metricType     String
  numericValue   Decimal?
  booleanValue   Boolean?
  textValue      String?
  jsonValue      Json?
  unit           String?
  status         ResultStatus @default(PENDING)
  source         String
  supersedesId   String?
  observedAt     DateTime @default(now())

  run            ActivityRun @relation(fields: [activityRunId], references: [id])

  @@index([activityRunId, metricKey])
  @@index([metricKey, numericValue])
}

model ScoreEntry {
  id             String @id @default(cuid())
  eventId        String
  activityRunId  String?
  participationEntryId String
  scoreKey       String
  type           ScoreEntryType
  amount         Decimal
  sourceKey      String?
  reason         String?
  createdById    String?
  relatedSubmissionId String?
  reversesEntryId String?
  createdAt      DateTime @default(now())

  run            ActivityRun? @relation(fields: [activityRunId], references: [id])

  @@index([eventId, participationEntryId, scoreKey])
  @@index([activityRunId, scoreKey])
}
```

## 15. Competition runtime

```prisma
model Competition {
  id                String @id @default(cuid())
  eventId           String
  activityInstanceId String @unique
  formatType        String
  configJson        Json
  state             String
  version           Int @default(1)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  activity          ActivityInstance @relation(fields: [activityInstanceId], references: [id])
  matches           Match[]
}

model Match {
  id             String @id @default(cuid())
  competitionId  String
  roundKey       String?
  sequence       Int?
  state          String
  stationId      String?
  scheduledAt    DateTime?
  resultJson     Json?
  resultStatus   ResultStatus @default(PENDING)
  startedAt      DateTime?
  completedAt    DateTime?
  finalizedAt    DateTime?

  competition    Competition @relation(fields: [competitionId], references: [id])
  sides          MatchSide[]

  @@index([competitionId, roundKey, sequence])
}

model MatchSide {
  id                   String @id @default(cuid())
  matchId              String
  participationEntryId String
  seed                  Int?
  sideKey               String?
  resultJson            Json?
  placement             Int?
  isWinner              Boolean?

  match                 Match @relation(fields: [matchId], references: [id])
  entry                 ParticipationEntry @relation(fields: [participationEntryId], references: [id])

  @@unique([matchId, participationEntryId])
}
```

## 16. Station visit / queue

```prisma
model StationVisit {
  id                   String @id @default(cuid())
  eventId              String
  stationId            String
  participationEntryId String
  routeStepId          String?
  status               String
  queuePosition        Int?
  checkedInAt          DateTime?
  calledAt             DateTime?
  startedAt            DateTime?
  completedAt          DateTime?
  metadataJson         Json?

  station              Station @relation(fields: [stationId], references: [id])

  @@index([stationId, status, queuePosition])
  @@index([participationEntryId, status])
}
```

## 17. Randomization

```prisma
model RandomizationRecord {
  id             String @id @default(cuid())
  eventId        String
  purpose        String
  scopeType      String
  scopeId        String
  algorithmVersion Int
  seedHash       String
  inputHash      String
  outputJson     Json
  definitionVersionId String?
  generatedAt    DateTime @default(now())

  @@index([eventId, purpose, scopeType, scopeId])
}
```

## 18. Audit and outbox

```prisma
model AuditLog {
  id          String @id @default(cuid())
  eventId     String?
  actorType   ActorType
  actorUserId String?
  action      String
  targetType  String
  targetId    String
  beforeJson  Json?
  afterJson   Json?
  metadataJson Json?
  reason      String?
  requestId   String?
  createdAt   DateTime @default(now())

  event       Event? @relation(fields: [eventId], references: [id])

  @@index([eventId, createdAt])
  @@index([targetType, targetId, createdAt])
}

model OutboxEvent {
  id            String @id @default(cuid())
  type          String
  schemaVersion Int
  aggregateType String
  aggregateId   String
  eventId       String?
  correlationId String
  causationId   String?
  payloadJson   Json
  occurredAt    DateTime @default(now())
  processedAt   DateTime?
  attempts      Int @default(0)

  @@index([processedAt, occurredAt])
  @@index([aggregateType, aggregateId])
}
```

## 19. Media and incidents

```prisma
model MediaAsset {
  id             String @id @default(cuid())
  organizationId String
  eventId        String?
  storageKey     String
  mimeType       String
  sizeBytes      BigInt
  visibility     String
  metadataJson   Json?
  uploadedById   String?
  createdAt      DateTime @default(now())
  deletedAt      DateTime?

  @@index([eventId, createdAt])
}

model Incident {
  id             String @id @default(cuid())
  eventId        String
  stationId      String?
  activityInstanceId String?
  severity       String
  category       String
  description    String
  status         String
  reportedById   String?
  metadataJson   Json?
  createdAt      DateTime @default(now())
  resolvedAt     DateTime?

  @@index([eventId, status, severity])
}
```

## 20. What remains intentionally JSON

Validated JSON is appropriate for:

- event terminology/feature policy;
- branding/theme semantics;
- activity block graph;
- activity rules;
- participation policy;
- scoring AST;
- question public/protected type-specific config;
- competition-format config;
- route-step conditional config;
- plugin-specific metadata;
- audit before/after snapshots.

It is **not** appropriate as a shortcut for core entities that must be queried and constrained, such as teams, participants, activity runs, submissions, metrics, scores, matches, stations, or audit rows.

## 21. Expected Phase 3 refinement

During real schema creation:

- add all explicit Prisma back-relations;
- decide cuid/uuid convention;
- formalize soft-delete/archive policy;
- add tenant/organization guards;
- add check constraints through SQL migrations where Prisma cannot express XOR/range invariants;
- finalize decimal precision;
- add partial indexes where useful;
- add RLS only if architecture needs it—application authorization remains mandatory either way.
