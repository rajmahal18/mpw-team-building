import { describe, expect, it } from "vitest";
import { assertSameOrigin, hashRateLimitKey, rateLimitWindowStart } from "@/server/security/request-security";

describe("phase 9 security primitives", () => {
  it("hashes rate-limit subjects instead of persisting raw identifiers", () => {
    const a = hashRateLimitKey("login", "127.0.0.1|admin@example.com");
    const b = hashRateLimitKey("login", "127.0.0.1|admin@example.com");
    expect(a).toHaveLength(64);
    expect(a).toBe(b);
    expect(a).not.toContain("admin@example.com");
  });

  it("uses deterministic windows", () => {
    const start = rateLimitWindowStart(Date.parse("2026-09-23T10:02:34Z"), 300);
    expect(start.toISOString()).toBe("2026-09-23T10:00:00.000Z");
  });

  it("rejects a cross-origin browser request", () => {
    const request = new Request("https://app.example.test/api/participant/submissions", { headers: { origin: "https://evil.example.test" } });
    expect(() => assertSameOrigin(request)).toThrow(/Cross-origin/);
  });

  it("accepts same-origin browser requests", () => {
    const request = new Request("https://app.example.test/api/participant/submissions", { headers: { origin: "https://app.example.test" } });
    expect(() => assertSameOrigin(request)).not.toThrow();
  });
});

// Security regressions discovered during the Phase 9 implementation audit.
describe("phase 9 audit regressions", () => {
  it("does not trust malformed request IDs", async () => {
    const { requestId } = await import("@/server/security/request-security");
    const value = requestId(new Request("https://app.example.test", { headers: { "x-request-id": "bad id with spaces" } }));
    expect(value).not.toBe("bad id with spaces");
    expect(value.length).toBeGreaterThan(10);
  });
});
