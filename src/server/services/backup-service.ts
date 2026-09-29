import { getPrisma } from "@/lib/prisma";
import { AuditService } from "./audit-service";

export class BackupService {
  async start(input: { organizationId: string; backupType: string; actorUserId: string; notes?: string }) {
    const run = await getPrisma().backupRun.create({ data: { organizationId: input.organizationId, backupType: input.backupType, createdById: input.actorUserId, notes: input.notes } });
    await new AuditService().record({ organizationId: input.organizationId, actorUserId: input.actorUserId, action: "BACKUP_RUN_STARTED", targetType: "BackupRun", targetId: run.id, after: { backupType: run.backupType } });
    return run;
  }

  async complete(input: { organizationId: string; id: string; status: "SUCCESS" | "FAILED" | "VERIFIED"; actorUserId: string; backupReference?: string; checksum?: string; sizeBytes?: bigint; notes?: string }) {
    const before = await getPrisma().backupRun.findFirst({ where: { id: input.id, organizationId: input.organizationId } });
    if (!before) throw new Error("Backup record not found in this organization");
    if (input.status === "VERIFIED" && before.status !== "SUCCESS" && before.status !== "VERIFIED") throw new Error("Only a successful backup can be verified");
    const now = new Date();
    const run = await getPrisma().backupRun.update({ where: { id: input.id }, data: { status: input.status, completedAt: input.status === "FAILED" || input.status === "SUCCESS" ? before.completedAt ?? now : before.completedAt, verifiedAt: input.status === "VERIFIED" ? before.verifiedAt ?? now : undefined, backupReference: input.backupReference, checksum: input.checksum, sizeBytes: input.sizeBytes, notes: input.notes } });
    await new AuditService().record({ organizationId: run.organizationId, actorUserId: input.actorUserId, action: "BACKUP_RUN_UPDATED", targetType: "BackupRun", targetId: run.id, before: { status: before.status }, after: { status: run.status, backupReference: run.backupReference, checksum: run.checksum }, reason: input.notes });
    return run;
  }
}
