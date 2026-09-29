import { getPrisma } from "@/lib/prisma";
import { AuditService } from "./audit-service";
import { ActivityRunService } from "./activity-run-service";

export class MediaModerationService {
  async setStatus(input: { assetId: string; status: "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN"; actorUserId: string; reason?: string }) {
    const asset = await getPrisma().mediaAsset.findUniqueOrThrow({ where: { id: input.assetId }, include: { event: true } });
    const updated = await getPrisma().mediaAsset.update({
      where: { id: asset.id },
      data: {
        moderationStatus: input.status,
        moderatedAt: input.status === "PENDING" ? null : new Date(),
        moderatedById: input.status === "PENDING" ? null : input.actorUserId,
      },
    });
    if (asset.activityRunId && asset.blockId) {
      const blockAssets = await getPrisma().mediaAsset.findMany({ where: { activityRunId: asset.activityRunId, blockId: asset.blockId } });
      const pending = blockAssets.some((item) => item.id === asset.id ? input.status === "PENDING" : item.moderationStatus === "PENDING");
      const rejected = blockAssets.some((item) => item.id === asset.id ? ["REJECTED", "HIDDEN"].includes(input.status) : ["REJECTED", "HIDDEN"].includes(item.moderationStatus));
      if (rejected) await getPrisma().submission.updateMany({ where: { activityRunId: asset.activityRunId, blockId: asset.blockId, status: "NEEDS_REVIEW" }, data: { status: "REJECTED" } });
      else if (!pending && blockAssets.length > 0) {
        await getPrisma().submission.updateMany({ where: { activityRunId: asset.activityRunId, blockId: asset.blockId, status: "NEEDS_REVIEW" }, data: { status: "ACCEPTED" } });
        await new ActivityRunService().tryComplete(asset.activityRunId);
      }
    }
    await new AuditService().record({
      organizationId: asset.event.organizationId,
      eventId: asset.eventId,
      actorUserId: input.actorUserId,
      action: `MEDIA_${input.status}`,
      targetType: "MediaAsset",
      targetId: asset.id,
      before: { moderationStatus: asset.moderationStatus },
      after: { moderationStatus: updated.moderationStatus },
      reason: input.reason,
    });
    return updated;
  }
}
