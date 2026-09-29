import { createHmac, timingSafeEqual } from "node:crypto";

export type CheckpointTokenPayload = {
  eventId: string;
  stationId: string;
  credentialId: string;
  purpose: "CHECK_IN";
  expiresAt: number;
  nonce: string;
};

function secret() {
  const value = process.env.QR_SIGNING_SECRET;
  if (!value || value.length < 32) throw new Error("QR_SIGNING_SECRET must be at least 32 characters");
  return value;
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signature(body: string) {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

export function createCheckpointToken(payload: CheckpointTokenPayload): string {
  const body = encode(JSON.stringify(payload));
  return `${body}.${signature(body)}`;
}

export function verifyCheckpointToken(token: string, now = Date.now()): CheckpointTokenPayload {
  const [body, supplied] = token.split(".");
  if (!body || !supplied) throw new Error("Malformed checkpoint token");
  const expected = signature(body);
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Invalid checkpoint token signature");
  const payload = JSON.parse(decode(body)) as CheckpointTokenPayload;
  if (payload.purpose !== "CHECK_IN" || !payload.eventId || !payload.stationId || !payload.credentialId || !payload.nonce) throw new Error("Invalid checkpoint token payload");
  if (!Number.isFinite(payload.expiresAt) || payload.expiresAt < now) throw new Error("Checkpoint token expired");
  return payload;
}
