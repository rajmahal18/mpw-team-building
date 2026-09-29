import { createHash, randomUUID } from "node:crypto";
import { headers } from "next/headers";

export class RateLimitExceededError extends Error {
  retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super("Too many requests. Please try again later.");
    this.name = "RateLimitExceededError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function requestId(request?: Request) {
  const supplied = request?.headers.get("x-request-id")?.trim();
  return supplied && /^[A-Za-z0-9._:-]{1,120}$/.test(supplied) ? supplied : randomUUID();
}

export function clientFingerprintFromHeaders(input: Headers): string {
  const forwarded = input.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = input.get("x-real-ip")?.trim();
  const candidate = forwarded || real || "unknown";
  return candidate.slice(0, 200);
}

export async function serverActionFingerprint() {
  return clientFingerprintFromHeaders(await headers());
}

function expectedOrigin(request: Request) {
  const configured = process.env.APP_ORIGIN?.replace(/\/$/, "");
  if (configured) return configured;
  return new URL(request.url).origin;
}

/**
 * State-changing API endpoints use same-origin checks in addition to SameSite cookies.
 * Missing Origin is accepted for non-browser clients; authentication remains mandatory.
 */
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  if (origin !== expectedOrigin(request)) throw new Error("Cross-origin request rejected");
}

export function hashRateLimitKey(scope: string, subject: string) {
  const secret = process.env.RATE_LIMIT_SECRET || (process.env.NODE_ENV === "production" ? "" : "development-only-rate-limit-secret");
  if (!secret) throw new Error("RATE_LIMIT_SECRET is required in production");
  return createHash("sha256").update(`${secret}|${scope}|${subject}`).digest("hex");
}

export function rateLimitWindowStart(now = Date.now(), windowSeconds = 60) {
  const ms = windowSeconds * 1000;
  return new Date(Math.floor(now / ms) * ms);
}
