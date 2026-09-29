-- Phase 9 baseline migration generated from prisma/schema.prisma.
-- This repository previously had no migration history; use as the baseline for fresh databases.

CREATE TYPE "EventState" AS ENUM ('DRAFT', 'CONFIGURING', 'REGISTRATION_OPEN', 'READY', 'LOCKED', 'LIVE', 'PAUSED', 'RESULTS_REVIEW', 'FINALIZED', 'ARCHIVED', 'CANCELLED');
CREATE TYPE "ActivityVersionState" AS ENUM ('DRAFT', 'READY', 'PUBLISHED', 'SUPERSEDED', 'RETIRED');
CREATE TYPE "ActivityRunState" AS ENUM ('CREATED', 'ELIGIBLE', 'IN_PROGRESS', 'PAUSED', 'SUBMITTED', 'PENDING_VERIFICATION', 'COMPLETED', 'FINALIZED', 'FAILED', 'SKIPPED', 'CANCELLED', 'VOID');
CREATE TYPE "SubmissionStatus" AS ENUM ('RECEIVED', 'VALIDATING', 'ACCEPTED', 'REJECTED', 'NEEDS_REVIEW', 'SUPERSEDED', 'VOID');
CREATE TYPE "ParticipationEntryKind" AS ENUM ('TEAM', 'INDIVIDUAL', 'PAIR', 'SUBGROUP', 'AD_HOC');
CREATE TYPE "ScoreEntryType" AS ENUM ('DERIVED', 'PLACEMENT', 'BONUS', 'PENALTY', 'MANUAL', 'OVERRIDE_DELTA', 'REVERSAL');
CREATE TYPE "ResultSnapshotState" AS ENUM ('PROVISIONAL', 'FINAL', 'VOID');
CREATE TYPE "StationState" AS ENUM ('DRAFT', 'READY', 'OPEN', 'PAUSED', 'CLOSED', 'DISABLED');
CREATE TYPE "StationVisitState" AS ENUM ('EXPECTED', 'QUEUED', 'CALLED', 'ARRIVED', 'ACTIVE', 'COMPLETED', 'SKIPPED', 'NO_SHOW', 'REROUTED', 'CANCELLED');
CREATE TYPE "CompetitionState" AS ENUM ('DRAFT', 'SEEDED', 'LIVE', 'REVIEW', 'COMPLETE', 'FINALIZED', 'ARCHIVED');
CREATE TYPE "MatchState" AS ENUM ('SCHEDULED', 'READY', 'LIVE', 'PENDING_RESULT', 'DISPUTED', 'FINAL', 'BYE', 'WALKOVER', 'CANCELLED', 'VOID');
CREATE TYPE "ActorType" AS ENUM ('USER', 'PARTICIPANT_SESSION', 'SYSTEM', 'IMPORT', 'JOB');
CREATE TYPE "AnnouncementStatus" AS ENUM ('DRAFT', 'LIVE', 'RETRACTED', 'EXPIRED');
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'FILE');
CREATE TYPE "MediaModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'HIDDEN');
CREATE TYPE "SecurityIncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "SecurityIncidentStatus" AS ENUM ('OPEN', 'CONTAINED', 'RESOLVED', 'CLOSED');
CREATE TYPE "PrivacyAssessmentStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'REASSESSMENT_REQUIRED', 'RETIRED');
CREATE TYPE "DataSubjectRequestType" AS ENUM ('ACCESS', 'RECTIFICATION', 'ERASURE', 'RESTRICTION', 'OBJECTION', 'PORTABILITY', 'OTHER');
CREATE TYPE "DataSubjectRequestStatus" AS ENUM ('RECEIVED', 'VERIFYING', 'IN_REVIEW', 'FULFILLED', 'DENIED', 'CLOSED');
CREATE TYPE "BackupRunStatus" AS ENUM ('STARTED', 'SUCCESS', 'FAILED', 'VERIFIED');
CREATE TYPE "ExportJobStatus" AS ENUM ('REQUESTED', 'RUNNING', 'COMPLETED', 'FAILED', 'EXPIRED');

CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserAccount" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "platformCapabilities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "disabledAt" TIMESTAMP(3),
    CONSTRAINT "UserAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userAccountId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "externalKey" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PersonAccountLink" (
    "personId" TEXT NOT NULL,
    "userAccountId" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PersonAccountLink_pkey" PRIMARY KEY ("personId", "userAccountId")
);

CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "state" "EventState" NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "configJson" JSONB NOT NULL,
    "brandingJson" JSONB,
    "currentSnapshotId" TEXT,
    "privacyNoticeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventSnapshot" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "snapshotJson" JSONB NOT NULL,
    "checksum" TEXT NOT NULL,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventParticipant" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "displayName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadataJson" JSONB,
    "joinedAt" TIMESTAMP(3),
    "checkedInAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EventParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "machineKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT,
    "colorToken" TEXT,
    "logoAssetId" TEXT,
    "accessCodeHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamMembership" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "eventParticipantId" TEXT NOT NULL,
    "roleKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    CONSTRAINT "TeamMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ParticipantSession" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "teamId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "label" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParticipantSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventRole" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "machineKey" TEXT NOT NULL,
    "capabilities" TEXT[] NOT NULL,
    "constraintsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EventRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventRoleAssignment" (
    "id" TEXT NOT NULL,
    "eventRoleId" TEXT NOT NULL,
    "userAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventRoleAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Station" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "machineKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "StationState" NOT NULL DEFAULT 'DRAFT',
    "capacity" INTEGER,
    "configJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Station_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StationActivityAssignment" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "activityInstanceId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "configJson" JSONB,
    CONSTRAINT "StationActivityAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoutePlan" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "machineKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "configJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RoutePlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RouteStep" (
    "id" TEXT NOT NULL,
    "routePlanId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "stationId" TEXT,
    "activityInstanceId" TEXT,
    "configJson" JSONB,
    CONSTRAINT "RouteStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamRouteAssignment" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "routePlanId" TEXT NOT NULL,
    "snapshotJson" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT TRUE,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    CONSTRAINT "TeamRouteAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StationVisit" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "participationEntryId" TEXT NOT NULL,
    "routeStepId" TEXT,
    "state" "StationVisitState" NOT NULL DEFAULT 'EXPECTED',
    "queuePosition" INTEGER,
    "checkInKey" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "calledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "skippedAt" TIMESTAMP(3),
    "reroutedAt" TIMESTAMP(3),
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StationVisit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CheckpointCredential" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "label" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CheckpointCredential_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StationStaffAssignment" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "userAccountId" TEXT NOT NULL,
    "roleKey" TEXT NOT NULL DEFAULT 'marshal',
    "active" BOOLEAN NOT NULL DEFAULT TRUE,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    CONSTRAINT "StationStaffAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RouteUnlockOverride" (
    "id" TEXT NOT NULL,
    "teamRouteAssignmentId" TEXT NOT NULL,
    "routeStepId" TEXT NOT NULL,
    "unlocked" BOOLEAN NOT NULL,
    "reason" TEXT NOT NULL,
    "actorUserId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RouteUnlockOverride_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventAnnouncement" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" "AnnouncementStatus" NOT NULL DEFAULT 'LIVE',
    "audienceKind" TEXT NOT NULL DEFAULT 'ALL',
    "audienceRefId" TEXT,
    "title" TEXT,
    "message" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EventAnnouncement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OperationalReceipt" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "resultJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OperationalReceipt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "activityInstanceId" TEXT,
    "machineKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "formatKey" TEXT NOT NULL,
    "configJson" JSONB,
    "state" "CompetitionState" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "roundKey" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "state" "MatchState" NOT NULL DEFAULT 'SCHEDULED',
    "resultJson" JSONB,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MatchSide" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "participationEntryId" TEXT NOT NULL,
    "sideKey" TEXT NOT NULL,
    "seed" INTEGER,
    "metadataJson" JSONB,
    "resultJson" JSONB,
    "placement" INTEGER,
    "isWinner" BOOLEAN,
    CONSTRAINT "MatchSide_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeaderboardDefinition" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "machineKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "configJson" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LeaderboardDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeaderboardSnapshot" (
    "id" TEXT NOT NULL,
    "leaderboardDefinitionId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "state" "ResultSnapshotState" NOT NULL DEFAULT 'PROVISIONAL',
    "standingsJson" JSONB NOT NULL,
    "inputHash" TEXT NOT NULL,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaderboardSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RandomizationRecord" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "outputJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RandomizationRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivityInstance" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "machineKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sourceTemplateId" TEXT,
    "currentVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ActivityInstance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivityDefinitionVersion" (
    "id" TEXT NOT NULL,
    "activityInstanceId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "state" "ActivityVersionState" NOT NULL DEFAULT 'DRAFT',
    "schemaVersion" INTEGER NOT NULL,
    "definitionJson" JSONB NOT NULL,
    "checksum" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityDefinitionVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ParticipationEntry" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "kind" "ParticipationEntryKind" NOT NULL,
    "teamId" TEXT,
    "label" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParticipationEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ParticipationEntryMember" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "eventParticipantId" TEXT NOT NULL,
    "roleKey" TEXT,
    CONSTRAINT "ParticipationEntryMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivityRun" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "activityInstanceId" TEXT NOT NULL,
    "activityDefinitionVersionId" TEXT NOT NULL,
    "participationEntryId" TEXT NOT NULL,
    "attemptNo" INTEGER NOT NULL DEFAULT 1,
    "roundKey" TEXT NOT NULL DEFAULT 'default',
    "state" "ActivityRunState" NOT NULL DEFAULT 'CREATED',
    "generatedContentJson" JSONB,
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ActivityRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "activityRunId" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'RECEIVED',
    "payloadJson" JSONB NOT NULL,
    "validationJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MetricObservation" (
    "id" TEXT NOT NULL,
    "activityRunId" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "valueJson" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "supersedesId" TEXT,
    "recordedById" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MetricObservation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScoreEntry" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "participationEntryId" TEXT NOT NULL,
    "activityInstanceId" TEXT,
    "activityRunId" TEXT,
    "dimensionKey" TEXT NOT NULL,
    "amount" DECIMAL(14,4) NOT NULL,
    "entryType" "ScoreEntryType" NOT NULL,
    "provenanceJson" JSONB,
    "reason" TEXT,
    "actorUserId" TEXT,
    "reversalOfId" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScoreEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "activityRunId" TEXT,
    "participantSessionId" TEXT,
    "blockId" TEXT,
    "kind" "MediaKind" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "originalName" TEXT,
    "byteSize" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "moderationStatus" "MediaModerationStatus" NOT NULL DEFAULT 'PENDING',
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "moderatedAt" TIMESTAMP(3),
    "moderatedById" TEXT,
    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivityTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "machineKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryKey" TEXT,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "isSystem" BOOLEAN NOT NULL DEFAULT FALSE,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentVersionId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ActivityTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivityTemplateVersion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "state" "ActivityVersionState" NOT NULL DEFAULT 'DRAFT',
    "schemaVersion" INTEGER NOT NULL,
    "definitionJson" JSONB NOT NULL,
    "checksum" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityTemplateVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrivacyNotice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "retiredAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrivacyNotice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrivacyImpactAssessment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventId" TEXT,
    "systemName" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" "PrivacyAssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "riskLevel" TEXT NOT NULL,
    "scopeJson" JSONB NOT NULL,
    "dataInventoryJson" JSONB NOT NULL,
    "riskAssessmentJson" JSONB NOT NULL,
    "safeguardsJson" JSONB NOT NULL,
    "reviewDueAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PrivacyImpactAssessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DataProcessingRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "privacyImpactAssessmentId" TEXT,
    "name" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "lawfulBasis" TEXT NOT NULL,
    "dataCategoriesJson" JSONB NOT NULL,
    "dataSubjectsJson" JSONB NOT NULL,
    "recipientsJson" JSONB NOT NULL,
    "retentionRule" TEXT NOT NULL,
    "securityMeasuresJson" JSONB NOT NULL,
    "systemLocationsJson" JSONB NOT NULL,
    "processorNamesJson" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DataProcessingRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DataSubjectRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventId" TEXT,
    "personId" TEXT,
    "requestType" "DataSubjectRequestType" NOT NULL,
    "status" "DataSubjectRequestStatus" NOT NULL DEFAULT 'RECEIVED',
    "subjectName" TEXT NOT NULL,
    "subjectContact" TEXT,
    "requestJson" JSONB,
    "responseJson" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DataSubjectRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SecurityIncident" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventId" TEXT,
    "severity" "SecurityIncidentSeverity" NOT NULL,
    "status" "SecurityIncidentStatus" NOT NULL DEFAULT 'OPEN',
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impactJson" JSONB,
    "containmentJson" JSONB,
    "notificationDueAt" TIMESTAMP(3),
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "containedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "reportedToNpcAt" TIMESTAMP(3),
    "affectedSubjectsCount" INTEGER,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SecurityIncident_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BackupRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "BackupRunStatus" NOT NULL DEFAULT 'STARTED',
    "backupType" TEXT NOT NULL,
    "backupReference" TEXT,
    "checksum" TEXT,
    "sizeBytes" BIGINT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "retentionUntil" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BackupRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RateLimitBucket" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "keyHash" TEXT NOT NULL,
    "windowStartedAt" TIMESTAMP(3) NOT NULL,
    "windowSeconds" INTEGER NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExportJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventId" TEXT,
    "requestedById" TEXT,
    "kind" TEXT NOT NULL,
    "status" "ExportJobStatus" NOT NULL DEFAULT 'REQUESTED',
    "filtersJson" JSONB,
    "fileName" TEXT,
    "resultRef" TEXT,
    "expiresAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "ExportJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventId" TEXT,
    "actorType" "ActorType" NOT NULL,
    "actorUserId" TEXT,
    "actorParticipantSessionId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "metadataJson" JSONB,
    "reason" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DomainEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "type" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "causationId" TEXT,
    "payloadJson" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DomainEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "UserAccount_email_key" ON "UserAccount"("email");
CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");
CREATE INDEX "AuthSession_userAccountId_expiresAt_idx" ON "AuthSession"("userAccountId", "expiresAt");
CREATE UNIQUE INDEX "Person_organizationId_externalKey_key" ON "Person"("organizationId", "externalKey");
CREATE INDEX "Person_organizationId_displayName_idx" ON "Person"("organizationId", "displayName");
CREATE UNIQUE INDEX "PersonAccountLink_userAccountId_key" ON "PersonAccountLink"("userAccountId");
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");
CREATE INDEX "Event_organizationId_state_idx" ON "Event"("organizationId", "state");
CREATE UNIQUE INDEX "EventSnapshot_eventId_sequence_key" ON "EventSnapshot"("eventId", "sequence");
CREATE UNIQUE INDEX "EventSnapshot_eventId_checksum_key" ON "EventSnapshot"("eventId", "checksum");
CREATE UNIQUE INDEX "EventParticipant_eventId_personId_key" ON "EventParticipant"("eventId", "personId");
CREATE INDEX "EventParticipant_eventId_status_idx" ON "EventParticipant"("eventId", "status");
CREATE UNIQUE INDEX "Team_eventId_machineKey_key" ON "Team"("eventId", "machineKey");
CREATE INDEX "Team_eventId_status_idx" ON "Team"("eventId", "status");
CREATE UNIQUE INDEX "TeamMembership_teamId_eventParticipantId_key" ON "TeamMembership"("teamId", "eventParticipantId");
CREATE INDEX "TeamMembership_eventParticipantId_idx" ON "TeamMembership"("eventParticipantId");
CREATE UNIQUE INDEX "ParticipantSession_tokenHash_key" ON "ParticipantSession"("tokenHash");
CREATE INDEX "ParticipantSession_eventId_expiresAt_idx" ON "ParticipantSession"("eventId", "expiresAt");
CREATE UNIQUE INDEX "EventRole_eventId_machineKey_key" ON "EventRole"("eventId", "machineKey");
CREATE UNIQUE INDEX "EventRoleAssignment_eventRoleId_userAccountId_key" ON "EventRoleAssignment"("eventRoleId", "userAccountId");
CREATE INDEX "EventRoleAssignment_userAccountId_idx" ON "EventRoleAssignment"("userAccountId");
CREATE UNIQUE INDEX "Station_eventId_machineKey_key" ON "Station"("eventId", "machineKey");
CREATE INDEX "Station_eventId_status_idx" ON "Station"("eventId", "status");
CREATE UNIQUE INDEX "StationActivityAssignment_stationId_activityInstanceId_key" ON "StationActivityAssignment"("stationId", "activityInstanceId");
CREATE INDEX "StationActivityAssignment_activityInstanceId_idx" ON "StationActivityAssignment"("activityInstanceId");
CREATE UNIQUE INDEX "RoutePlan_eventId_machineKey_key" ON "RoutePlan"("eventId", "machineKey");
CREATE UNIQUE INDEX "RouteStep_routePlanId_sequence_key" ON "RouteStep"("routePlanId", "sequence");
CREATE INDEX "RouteStep_stationId_idx" ON "RouteStep"("stationId");
CREATE INDEX "RouteStep_activityInstanceId_idx" ON "RouteStep"("activityInstanceId");
CREATE INDEX "TeamRouteAssignment_teamId_active_assignedAt_idx" ON "TeamRouteAssignment"("teamId", "active", "assignedAt");
CREATE INDEX "TeamRouteAssignment_routePlanId_active_idx" ON "TeamRouteAssignment"("routePlanId", "active");
CREATE UNIQUE INDEX "StationVisit_checkInKey_key" ON "StationVisit"("checkInKey");
CREATE INDEX "StationVisit_stationId_state_createdAt_idx" ON "StationVisit"("stationId", "state", "createdAt");
CREATE INDEX "StationVisit_participationEntryId_state_idx" ON "StationVisit"("participationEntryId", "state");
CREATE INDEX "StationVisit_routeStepId_state_idx" ON "StationVisit"("routeStepId", "state");
CREATE UNIQUE INDEX "CheckpointCredential_nonce_key" ON "CheckpointCredential"("nonce");
CREATE INDEX "CheckpointCredential_stationId_revokedAt_expiresAt_idx" ON "CheckpointCredential"("stationId", "revokedAt", "expiresAt");
CREATE INDEX "CheckpointCredential_eventId_createdAt_idx" ON "CheckpointCredential"("eventId", "createdAt");
CREATE UNIQUE INDEX "StationStaffAssignment_stationId_userAccountId_roleKey_key" ON "StationStaffAssignment"("stationId", "userAccountId", "roleKey");
CREATE INDEX "StationStaffAssignment_userAccountId_active_idx" ON "StationStaffAssignment"("userAccountId", "active");
CREATE UNIQUE INDEX "RouteUnlockOverride_teamRouteAssignmentId_routeStepId_key" ON "RouteUnlockOverride"("teamRouteAssignmentId", "routeStepId");
CREATE INDEX "RouteUnlockOverride_routeStepId_unlocked_idx" ON "RouteUnlockOverride"("routeStepId", "unlocked");
CREATE INDEX "EventAnnouncement_eventId_status_startsAt_idx" ON "EventAnnouncement"("eventId", "status", "startsAt");
CREATE INDEX "EventAnnouncement_eventId_audienceKind_audienceRefId_idx" ON "EventAnnouncement"("eventId", "audienceKind", "audienceRefId");
CREATE UNIQUE INDEX "OperationalReceipt_eventId_idempotencyKey_key" ON "OperationalReceipt"("eventId", "idempotencyKey");
CREATE INDEX "OperationalReceipt_eventId_operationType_createdAt_idx" ON "OperationalReceipt"("eventId", "operationType", "createdAt");
CREATE UNIQUE INDEX "Competition_eventId_machineKey_key" ON "Competition"("eventId", "machineKey");
CREATE INDEX "Competition_eventId_state_idx" ON "Competition"("eventId", "state");
CREATE UNIQUE INDEX "Match_competitionId_roundKey_sequence_key" ON "Match"("competitionId", "roundKey", "sequence");
CREATE INDEX "Match_competitionId_state_idx" ON "Match"("competitionId", "state");
CREATE UNIQUE INDEX "MatchSide_matchId_sideKey_key" ON "MatchSide"("matchId", "sideKey");
CREATE UNIQUE INDEX "MatchSide_matchId_participationEntryId_key" ON "MatchSide"("matchId", "participationEntryId");
CREATE UNIQUE INDEX "LeaderboardDefinition_eventId_machineKey_key" ON "LeaderboardDefinition"("eventId", "machineKey");
CREATE INDEX "LeaderboardDefinition_eventId_status_idx" ON "LeaderboardDefinition"("eventId", "status");
CREATE UNIQUE INDEX "LeaderboardSnapshot_leaderboardDefinitionId_revision_key" ON "LeaderboardSnapshot"("leaderboardDefinitionId", "revision");
CREATE INDEX "LeaderboardSnapshot_leaderboardDefinitionId_state_createdAt_idx" ON "LeaderboardSnapshot"("leaderboardDefinitionId", "state", "createdAt");
CREATE INDEX "RandomizationRecord_eventId_purpose_createdAt_idx" ON "RandomizationRecord"("eventId", "purpose", "createdAt");
CREATE UNIQUE INDEX "ActivityInstance_eventId_machineKey_key" ON "ActivityInstance"("eventId", "machineKey");
CREATE INDEX "ActivityInstance_eventId_status_idx" ON "ActivityInstance"("eventId", "status");
CREATE UNIQUE INDEX "ActivityDefinitionVersion_activityInstanceId_version_key" ON "ActivityDefinitionVersion"("activityInstanceId", "version");
CREATE UNIQUE INDEX "ActivityDefinitionVersion_activityInstanceId_checksum_key" ON "ActivityDefinitionVersion"("activityInstanceId", "checksum");
CREATE INDEX "ActivityDefinitionVersion_activityInstanceId_state_idx" ON "ActivityDefinitionVersion"("activityInstanceId", "state");
CREATE INDEX "ParticipationEntry_eventId_kind_idx" ON "ParticipationEntry"("eventId", "kind");
CREATE INDEX "ParticipationEntry_teamId_idx" ON "ParticipationEntry"("teamId");
CREATE UNIQUE INDEX "ParticipationEntryMember_entryId_eventParticipantId_key" ON "ParticipationEntryMember"("entryId", "eventParticipantId");
CREATE UNIQUE INDEX "ActivityRun_activityInstanceId_participationEntryId_attemptNo_roundKey_key" ON "ActivityRun"("activityInstanceId", "participationEntryId", "attemptNo", "roundKey");
CREATE INDEX "ActivityRun_eventId_state_idx" ON "ActivityRun"("eventId", "state");
CREATE INDEX "ActivityRun_activityInstanceId_state_idx" ON "ActivityRun"("activityInstanceId", "state");
CREATE UNIQUE INDEX "Submission_activityRunId_idempotencyKey_key" ON "Submission"("activityRunId", "idempotencyKey");
CREATE INDEX "Submission_activityRunId_blockId_idx" ON "Submission"("activityRunId", "blockId");
CREATE INDEX "MetricObservation_activityRunId_metricKey_idx" ON "MetricObservation"("activityRunId", "metricKey");
CREATE UNIQUE INDEX "ScoreEntry_idempotencyKey_key" ON "ScoreEntry"("idempotencyKey");
CREATE INDEX "ScoreEntry_eventId_participationEntryId_dimensionKey_idx" ON "ScoreEntry"("eventId", "participationEntryId", "dimensionKey");
CREATE INDEX "ScoreEntry_activityRunId_idx" ON "ScoreEntry"("activityRunId");
CREATE INDEX "MediaAsset_eventId_createdAt_idx" ON "MediaAsset"("eventId", "createdAt");
CREATE INDEX "MediaAsset_activityRunId_blockId_idx" ON "MediaAsset"("activityRunId", "blockId");
CREATE INDEX "MediaAsset_moderationStatus_createdAt_idx" ON "MediaAsset"("moderationStatus", "createdAt");
CREATE UNIQUE INDEX "ActivityTemplate_organizationId_machineKey_key" ON "ActivityTemplate"("organizationId", "machineKey");
CREATE INDEX "ActivityTemplate_organizationId_status_idx" ON "ActivityTemplate"("organizationId", "status");
CREATE UNIQUE INDEX "ActivityTemplateVersion_templateId_version_key" ON "ActivityTemplateVersion"("templateId", "version");
CREATE UNIQUE INDEX "ActivityTemplateVersion_templateId_checksum_key" ON "ActivityTemplateVersion"("templateId", "checksum");
CREATE INDEX "ActivityTemplateVersion_templateId_state_idx" ON "ActivityTemplateVersion"("templateId", "state");
CREATE UNIQUE INDEX "PrivacyNotice_organizationId_version_key" ON "PrivacyNotice"("organizationId", "version");
CREATE INDEX "PrivacyNotice_organizationId_publishedAt_idx" ON "PrivacyNotice"("organizationId", "publishedAt");
CREATE INDEX "PrivacyImpactAssessment_organizationId_status_idx" ON "PrivacyImpactAssessment"("organizationId", "status");
CREATE INDEX "PrivacyImpactAssessment_eventId_status_idx" ON "PrivacyImpactAssessment"("eventId", "status");
CREATE INDEX "DataProcessingRecord_organizationId_status_idx" ON "DataProcessingRecord"("organizationId", "status");
CREATE INDEX "DataSubjectRequest_organizationId_status_receivedAt_idx" ON "DataSubjectRequest"("organizationId", "status", "receivedAt");
CREATE INDEX "DataSubjectRequest_eventId_status_idx" ON "DataSubjectRequest"("eventId", "status");
CREATE INDEX "DataSubjectRequest_personId_idx" ON "DataSubjectRequest"("personId");
CREATE INDEX "SecurityIncident_organizationId_status_severity_idx" ON "SecurityIncident"("organizationId", "status", "severity");
CREATE INDEX "SecurityIncident_eventId_status_idx" ON "SecurityIncident"("eventId", "status");
CREATE INDEX "BackupRun_organizationId_status_startedAt_idx" ON "BackupRun"("organizationId", "status", "startedAt");
CREATE UNIQUE INDEX "RateLimitBucket_keyHash_windowStartedAt_key" ON "RateLimitBucket"("keyHash", "windowStartedAt");
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");
CREATE INDEX "ExportJob_organizationId_status_createdAt_idx" ON "ExportJob"("organizationId", "status", "createdAt");
CREATE INDEX "ExportJob_eventId_kind_createdAt_idx" ON "ExportJob"("eventId", "kind", "createdAt");
CREATE INDEX "AuditLog_eventId_createdAt_idx" ON "AuditLog"("eventId", "createdAt");
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");
CREATE INDEX "DomainEvent_processedAt_createdAt_idx" ON "DomainEvent"("processedAt", "createdAt");
CREATE INDEX "DomainEvent_eventId_occurredAt_idx" ON "DomainEvent"("eventId", "occurredAt");

ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userAccountId_fkey" FOREIGN KEY ("userAccountId") REFERENCES "UserAccount"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "Person" ADD CONSTRAINT "Person_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE CASCADE;
ALTER TABLE "PersonAccountLink" ADD CONSTRAINT "PersonAccountLink_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON UPDATE CASCADE;
ALTER TABLE "PersonAccountLink" ADD CONSTRAINT "PersonAccountLink_userAccountId_fkey" FOREIGN KEY ("userAccountId") REFERENCES "UserAccount"("id") ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_privacyNoticeId_fkey" FOREIGN KEY ("privacyNoticeId") REFERENCES "PrivacyNotice"("id") ON UPDATE CASCADE;
ALTER TABLE "EventSnapshot" ADD CONSTRAINT "EventSnapshot_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON UPDATE CASCADE;
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON UPDATE CASCADE;
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON UPDATE CASCADE;
ALTER TABLE "Team" ADD CONSTRAINT "Team_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON UPDATE CASCADE;
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON UPDATE CASCADE;
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_eventParticipantId_fkey" FOREIGN KEY ("eventParticipantId") REFERENCES "EventParticipant"("id") ON UPDATE CASCADE;
ALTER TABLE "ParticipantSession" ADD CONSTRAINT "ParticipantSession_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON UPDATE CASCADE;
ALTER TABLE "ParticipantSession" ADD CONSTRAINT "ParticipantSession_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON UPDATE CASCADE;
ALTER TABLE "EventRole" ADD CONSTRAINT "EventRole_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON UPDATE CASCADE;
ALTER TABLE "EventRoleAssignment" ADD CONSTRAINT "EventRoleAssignment_eventRoleId_fkey" FOREIGN KEY ("eventRoleId") REFERENCES "EventRole"("id") ON UPDATE CASCADE;
ALTER TABLE "EventRoleAssignment" ADD CONSTRAINT "EventRoleAssignment_userAccountId_fkey" FOREIGN KEY ("userAccountId") REFERENCES "UserAccount"("id") ON UPDATE CASCADE;
ALTER TABLE "Station" ADD CONSTRAINT "Station_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON UPDATE CASCADE;
ALTER TABLE "StationActivityAssignment" ADD CONSTRAINT "StationActivityAssignment_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON UPDATE CASCADE;
ALTER TABLE "StationActivityAssignment" ADD CONSTRAINT "StationActivityAssignment_activityInstanceId_fkey" FOREIGN KEY ("activityInstanceId") REFERENCES "ActivityInstance"("id") ON UPDATE CASCADE;
ALTER TABLE "RoutePlan" ADD CONSTRAINT "RoutePlan_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON UPDATE CASCADE;
ALTER TABLE "RouteStep" ADD CONSTRAINT "RouteStep_routePlanId_fkey" FOREIGN KEY ("routePlanId") REFERENCES "RoutePlan"("id") ON UPDATE CASCADE;
ALTER TABLE "RouteStep" ADD CONSTRAINT "RouteStep_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON UPDATE CASCADE;
ALTER TABLE "RouteStep" ADD CONSTRAINT "RouteStep_activityInstanceId_fkey" FOREIGN KEY ("activityInstanceId") REFERENCES "ActivityInstance"("id") ON UPDATE CASCADE;
ALTER TABLE "TeamRouteAssignment" ADD CONSTRAINT "TeamRouteAssignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON UPDATE CASCADE;
ALTER TABLE "TeamRouteAssignment" ADD CONSTRAINT "TeamRouteAssignment_routePlanId_fkey" FOREIGN KEY ("routePlanId") REFERENCES "RoutePlan"("id") ON UPDATE CASCADE;
ALTER TABLE "StationVisit" ADD CONSTRAINT "StationVisit_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON UPDATE CASCADE;
ALTER TABLE "StationVisit" ADD CONSTRAINT "StationVisit_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON UPDATE CASCADE;
ALTER TABLE "StationVisit" ADD CONSTRAINT "StationVisit_participationEntryId_fkey" FOREIGN KEY ("participationEntryId") REFERENCES "ParticipationEntry"("id") ON UPDATE CASCADE;
ALTER TABLE "StationVisit" ADD CONSTRAINT "StationVisit_routeStepId_fkey" FOREIGN KEY ("routeStepId") REFERENCES "RouteStep"("id") ON UPDATE CASCADE;
ALTER TABLE "CheckpointCredential" ADD CONSTRAINT "CheckpointCredential_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON UPDATE CASCADE;
ALTER TABLE "CheckpointCredential" ADD CONSTRAINT "CheckpointCredential_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON UPDATE CASCADE;
ALTER TABLE "StationStaffAssignment" ADD CONSTRAINT "StationStaffAssignment_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON UPDATE CASCADE;
ALTER TABLE "StationStaffAssignment" ADD CONSTRAINT "StationStaffAssignment_userAccountId_fkey" FOREIGN KEY ("userAccountId") REFERENCES "UserAccount"("id") ON UPDATE CASCADE;
ALTER TABLE "RouteUnlockOverride" ADD CONSTRAINT "RouteUnlockOverride_teamRouteAssignmentId_fkey" FOREIGN KEY ("teamRouteAssignmentId") REFERENCES "TeamRouteAssignment"("id") ON UPDATE CASCADE;
ALTER TABLE "RouteUnlockOverride" ADD CONSTRAINT "RouteUnlockOverride_routeStepId_fkey" FOREIGN KEY ("routeStepId") REFERENCES "RouteStep"("id") ON UPDATE CASCADE;
ALTER TABLE "EventAnnouncement" ADD CONSTRAINT "EventAnnouncement_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON UPDATE CASCADE;
ALTER TABLE "OperationalReceipt" ADD CONSTRAINT "OperationalReceipt_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON UPDATE CASCADE;
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON UPDATE CASCADE;
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_activityInstanceId_fkey" FOREIGN KEY ("activityInstanceId") REFERENCES "ActivityInstance"("id") ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON UPDATE CASCADE;
ALTER TABLE "MatchSide" ADD CONSTRAINT "MatchSide_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON UPDATE CASCADE;
ALTER TABLE "MatchSide" ADD CONSTRAINT "MatchSide_participationEntryId_fkey" FOREIGN KEY ("participationEntryId") REFERENCES "ParticipationEntry"("id") ON UPDATE CASCADE;
ALTER TABLE "LeaderboardDefinition" ADD CONSTRAINT "LeaderboardDefinition_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON UPDATE CASCADE;
ALTER TABLE "LeaderboardSnapshot" ADD CONSTRAINT "LeaderboardSnapshot_leaderboardDefinitionId_fkey" FOREIGN KEY ("leaderboardDefinitionId") REFERENCES "LeaderboardDefinition"("id") ON UPDATE CASCADE;
ALTER TABLE "RandomizationRecord" ADD CONSTRAINT "RandomizationRecord_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON UPDATE CASCADE;
ALTER TABLE "ActivityInstance" ADD CONSTRAINT "ActivityInstance_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON UPDATE CASCADE;
ALTER TABLE "ActivityInstance" ADD CONSTRAINT "ActivityInstance_sourceTemplateId_fkey" FOREIGN KEY ("sourceTemplateId") REFERENCES "ActivityTemplate"("id") ON UPDATE CASCADE;
ALTER TABLE "ActivityDefinitionVersion" ADD CONSTRAINT "ActivityDefinitionVersion_activityInstanceId_fkey" FOREIGN KEY ("activityInstanceId") REFERENCES "ActivityInstance"("id") ON UPDATE CASCADE;
ALTER TABLE "ParticipationEntry" ADD CONSTRAINT "ParticipationEntry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON UPDATE CASCADE;
ALTER TABLE "ParticipationEntry" ADD CONSTRAINT "ParticipationEntry_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON UPDATE CASCADE;
ALTER TABLE "ParticipationEntryMember" ADD CONSTRAINT "ParticipationEntryMember_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ParticipationEntry"("id") ON UPDATE CASCADE;
ALTER TABLE "ParticipationEntryMember" ADD CONSTRAINT "ParticipationEntryMember_eventParticipantId_fkey" FOREIGN KEY ("eventParticipantId") REFERENCES "EventParticipant"("id") ON UPDATE CASCADE;
ALTER TABLE "ActivityRun" ADD CONSTRAINT "ActivityRun_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON UPDATE CASCADE;
ALTER TABLE "ActivityRun" ADD CONSTRAINT "ActivityRun_activityInstanceId_fkey" FOREIGN KEY ("activityInstanceId") REFERENCES "ActivityInstance"("id") ON UPDATE CASCADE;
ALTER TABLE "ActivityRun" ADD CONSTRAINT "ActivityRun_activityDefinitionVersionId_fkey" FOREIGN KEY ("activityDefinitionVersionId") REFERENCES "ActivityDefinitionVersion"("id") ON UPDATE CASCADE;
ALTER TABLE "ActivityRun" ADD CONSTRAINT "ActivityRun_participationEntryId_fkey" FOREIGN KEY ("participationEntryId") REFERENCES "ParticipationEntry"("id") ON UPDATE CASCADE;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_activityRunId_fkey" FOREIGN KEY ("activityRunId") REFERENCES "ActivityRun"("id") ON UPDATE CASCADE;
ALTER TABLE "MetricObservation" ADD CONSTRAINT "MetricObservation_activityRunId_fkey" FOREIGN KEY ("activityRunId") REFERENCES "ActivityRun"("id") ON UPDATE CASCADE;
ALTER TABLE "ScoreEntry" ADD CONSTRAINT "ScoreEntry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON UPDATE CASCADE;
ALTER TABLE "ScoreEntry" ADD CONSTRAINT "ScoreEntry_participationEntryId_fkey" FOREIGN KEY ("participationEntryId") REFERENCES "ParticipationEntry"("id") ON UPDATE CASCADE;
ALTER TABLE "ScoreEntry" ADD CONSTRAINT "ScoreEntry_activityInstanceId_fkey" FOREIGN KEY ("activityInstanceId") REFERENCES "ActivityInstance"("id") ON UPDATE CASCADE;
ALTER TABLE "ScoreEntry" ADD CONSTRAINT "ScoreEntry_activityRunId_fkey" FOREIGN KEY ("activityRunId") REFERENCES "ActivityRun"("id") ON UPDATE CASCADE;
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON UPDATE CASCADE;
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_activityRunId_fkey" FOREIGN KEY ("activityRunId") REFERENCES "ActivityRun"("id") ON UPDATE CASCADE;
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_participantSessionId_fkey" FOREIGN KEY ("participantSessionId") REFERENCES "ParticipantSession"("id") ON UPDATE CASCADE;
ALTER TABLE "ActivityTemplate" ADD CONSTRAINT "ActivityTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE CASCADE;
ALTER TABLE "ActivityTemplateVersion" ADD CONSTRAINT "ActivityTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ActivityTemplate"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "PrivacyNotice" ADD CONSTRAINT "PrivacyNotice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE CASCADE;
ALTER TABLE "PrivacyImpactAssessment" ADD CONSTRAINT "PrivacyImpactAssessment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE CASCADE;
ALTER TABLE "PrivacyImpactAssessment" ADD CONSTRAINT "PrivacyImpactAssessment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON UPDATE CASCADE;
ALTER TABLE "DataProcessingRecord" ADD CONSTRAINT "DataProcessingRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE CASCADE;
ALTER TABLE "DataProcessingRecord" ADD CONSTRAINT "DataProcessingRecord_privacyImpactAssessmentId_fkey" FOREIGN KEY ("privacyImpactAssessmentId") REFERENCES "PrivacyImpactAssessment"("id") ON UPDATE CASCADE;
ALTER TABLE "DataSubjectRequest" ADD CONSTRAINT "DataSubjectRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE CASCADE;
ALTER TABLE "DataSubjectRequest" ADD CONSTRAINT "DataSubjectRequest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON UPDATE CASCADE;
ALTER TABLE "DataSubjectRequest" ADD CONSTRAINT "DataSubjectRequest_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON UPDATE CASCADE;
ALTER TABLE "SecurityIncident" ADD CONSTRAINT "SecurityIncident_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE CASCADE;
ALTER TABLE "SecurityIncident" ADD CONSTRAINT "SecurityIncident_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON UPDATE CASCADE;
ALTER TABLE "BackupRun" ADD CONSTRAINT "BackupRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE CASCADE;
ALTER TABLE "RateLimitBucket" ADD CONSTRAINT "RateLimitBucket_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE CASCADE;
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE CASCADE;
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "UserAccount"("id") ON UPDATE CASCADE;
ALTER TABLE "DomainEvent" ADD CONSTRAINT "DomainEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON UPDATE CASCADE;
