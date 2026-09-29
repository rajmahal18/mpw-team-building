import { beforeEach, describe, expect, it } from "vitest";
import { createCheckpointToken, verifyCheckpointToken } from "@/server/security/checkpoint-token";

describe("signed checkpoint token", () => {
  beforeEach(() => { process.env.QR_SIGNING_SECRET = "0123456789abcdef0123456789abcdef"; });

  it("round-trips an unexpired station check-in token", () => {
    const payload = { eventId: "event-1", stationId: "station-9", credentialId: "cred-1", purpose: "CHECK_IN" as const, expiresAt: Date.now() + 60_000, nonce: "nonce-1" };
    expect(verifyCheckpointToken(createCheckpointToken(payload))).toEqual(payload);
  });

  it("rejects an expired token", () => {
    const token = createCheckpointToken({ eventId: "event-1", stationId: "station-9", credentialId: "cred-1", purpose: "CHECK_IN", expiresAt: 1000, nonce: "nonce-1" });
    expect(() => verifyCheckpointToken(token, 1001)).toThrow(/expired/i);
  });
});
