import { randomBytes } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import { createCheckpointToken, type CheckpointTokenPayload } from "@/server/security/checkpoint-token";
import { AuditService } from "./audit-service";

export class CheckpointCredentialService {
  async rotate(input: { stationId: string; expiresAt?: Date; label?: string; actorUserId: string }) {
    const station = await getPrisma().station.findUniqueOrThrow({ where: { id: input.stationId }, include: { event: true } });
    const now = new Date();
    const expiresAt = input.expiresAt ?? station.event.endsAt ?? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (expiresAt <= now) throw new Error("Checkpoint QR expiry must be in the future");
    const nonce = randomBytes(24).toString("base64url");
    const credential = await getPrisma().$transaction(async (tx) => {
      await tx.checkpointCredential.updateMany({ where: { stationId: station.id, revokedAt: null }, data: { revokedAt: now } });
      return tx.checkpointCredential.create({ data: { eventId: station.eventId, stationId: station.id, nonce, label: input.label, expiresAt, createdById: input.actorUserId } });
    });
    await new AuditService().record({ organizationId: station.event.organizationId, eventId: station.eventId, actorUserId: input.actorUserId, action: "CHECKPOINT_QR_ROTATED", targetType: "Station", targetId: station.id, after: { credentialId: credential.id, expiresAt: credential.expiresAt } });
    return credential;
  }

  async revoke(input: { credentialId: string; actorUserId: string; reason?: string }) {
    const credential = await getPrisma().checkpointCredential.findUniqueOrThrow({ where: { id: input.credentialId }, include: { event: true } });
    if (credential.revokedAt) return credential;
    const updated = await getPrisma().checkpointCredential.update({ where: { id: credential.id }, data: { revokedAt: new Date() } });
    await new AuditService().record({ organizationId: credential.event.organizationId, eventId: credential.eventId, actorUserId: input.actorUserId, action: "CHECKPOINT_QR_REVOKED", targetType: "CheckpointCredential", targetId: credential.id, reason: input.reason });
    return updated;
  }

  tokenFor(credential: { id: string; eventId: string; stationId: string; nonce: string; expiresAt: Date }) {
    return createCheckpointToken({ eventId: credential.eventId, stationId: credential.stationId, credentialId: credential.id, purpose: "CHECK_IN", expiresAt: credential.expiresAt.getTime(), nonce: credential.nonce });
  }

  async validate(payload: CheckpointTokenPayload) {
    const credential = await getPrisma().checkpointCredential.findUnique({ where: { id: payload.credentialId } });
    if (!credential) throw new Error("Checkpoint QR is no longer recognized");
    if (credential.eventId !== payload.eventId || credential.stationId !== payload.stationId || credential.nonce !== payload.nonce) throw new Error("Checkpoint QR does not match this station");
    if (credential.revokedAt) throw new Error("Checkpoint QR has been rotated or revoked");
    if (credential.expiresAt.getTime() < Date.now()) throw new Error("Checkpoint QR has expired");
    return credential;
  }
}
