import { createHash } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import { ActivityDefinitionSchema } from "@/schemas/activity";
import { findActivityBlock } from "@/engine/blocks/registry";

const MIME_KIND = new Map<string, "IMAGE" | "VIDEO" | "AUDIO" | "FILE">([
  ["image/jpeg", "IMAGE"],
  ["image/png", "IMAGE"],
  ["image/webp", "IMAGE"],
  ["image/gif", "IMAGE"],
  ["video/mp4", "VIDEO"],
  ["video/webm", "VIDEO"],
  ["video/quicktime", "VIDEO"],
  ["audio/mpeg", "AUDIO"],
  ["audio/mp4", "AUDIO"],
  ["audio/wav", "AUDIO"],
  ["audio/x-wav", "AUDIO"],
  ["audio/ogg", "AUDIO"],
  ["application/pdf", "FILE"],
  ["application/msword", "FILE"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "FILE"],
]);

function mediaKindForMime(mimeType: string) {
  return MIME_KIND.get(mimeType.toLowerCase());
}

function maxBytes(kind: "IMAGE" | "VIDEO" | "AUDIO" | "FILE") {
  const defaults = { IMAGE: 8, VIDEO: 30, AUDIO: 15, FILE: 15 } as const;
  const envKey = `MEDIA_MAX_${kind}_MB`;
  const mb = Number(process.env[envKey] || defaults[kind]);
  return Math.max(1, Number.isFinite(mb) ? mb : defaults[kind]) * 1024 * 1024;
}

export class MediaService {
  async createParticipantAsset(input: {
    eventId: string;
    activityRunId: string;
    blockId: string;
    participantSessionId: string;
    file: File;
  }) {
    const run = await getPrisma().activityRun.findUniqueOrThrow({
      where: { id: input.activityRunId },
      include: { definitionVersion: true, participationEntry: true },
    });
    if (run.eventId !== input.eventId) throw new Error("Activity run belongs to another event");
    if (run.state !== "IN_PROGRESS") throw new Error("Activity run is not accepting media");
    const participantSession = await getPrisma().participantSession.findUnique({ where: { id: input.participantSessionId } });
    if (!participantSession || participantSession.eventId !== input.eventId || participantSession.expiresAt <= new Date()) throw new Error("Participant session is invalid or expired");
    if (participantSession.teamId && participantSession.teamId !== run.participationEntry.teamId) throw new Error("Participant session does not own this activity run");

    const definition = ActivityDefinitionSchema.parse(run.definitionVersion.definitionJson);
    const block = findActivityBlock(definition, input.blockId);
    if (!block || block.type !== "media_submission") throw new Error("This block does not accept media uploads");

    const mimeType = (input.file.type || "").toLowerCase();
    const kind = mediaKindForMime(mimeType);
    if (!kind) throw new Error("This file type is not supported");
    if (!block.acceptedKinds.includes(kind)) throw new Error(`Media kind ${kind} is not accepted for this task`);
    if (input.file.size <= 0) throw new Error("The selected file is empty");
    if (input.file.size > maxBytes(kind)) throw new Error(`${kind.toLowerCase()} exceeds the configured upload size limit`);

    const bytes = Buffer.from(await input.file.arrayBuffer());
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const duplicate = await getPrisma().mediaAsset.findFirst({
      where: { activityRunId: run.id, blockId: block.id, sha256 },
    });
    if (duplicate) return duplicate;

    const existingCount = await getPrisma().mediaAsset.count({
      where: { activityRunId: run.id, blockId: block.id, participantSessionId: input.participantSessionId },
    });
    if (existingCount >= block.maxItems) throw new Error("This task already has the maximum number of uploaded files");

    return getPrisma().mediaAsset.create({
      data: {
        eventId: input.eventId,
        activityRunId: run.id,
        participantSessionId: input.participantSessionId,
        blockId: block.id,
        kind,
        mimeType,
        originalName: input.file.name || undefined,
        byteSize: bytes.byteLength,
        sha256,
        data: bytes,
        moderationStatus: block.requireMarshalReview ? "PENDING" : "APPROVED",
        metadataJson: { source: "PARTICIPANT_UPLOAD" },
      },
    });
  }

  async assertAssetsForSubmission(input: { activityRunId: string; blockId: string; assetIds: string[] }) {
    const unique = [...new Set(input.assetIds)];
    const assets = await getPrisma().mediaAsset.findMany({ where: { id: { in: unique }, activityRunId: input.activityRunId, blockId: input.blockId } });
    if (assets.length !== unique.length) throw new Error("One or more media assets do not belong to this activity task");
    return assets;
  }
}
