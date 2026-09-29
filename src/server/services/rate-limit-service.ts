import { getPrisma } from "@/lib/prisma";
import { hashRateLimitKey, rateLimitWindowStart, RateLimitExceededError } from "@/server/security/request-security";
export { RateLimitExceededError } from "@/server/security/request-security";

export const RATE_LIMITS = {
  login: { max: 8, windowSeconds: 300 },
  teamJoin: { max: 12, windowSeconds: 300 },
  submission: { max: 60, windowSeconds: 60 },
  media: { max: 20, windowSeconds: 60 },
  export: { max: 10, windowSeconds: 300 },
} as const;

export class RateLimitService {
  async consume(input: { scope: keyof typeof RATE_LIMITS; subject: string; organizationId?: string }) {
    const limit = RATE_LIMITS[input.scope];
    const windowStartedAt = rateLimitWindowStart(Date.now(), limit.windowSeconds);
    const expiresAt = new Date(windowStartedAt.getTime() + limit.windowSeconds * 1000);
    const keyHash = hashRateLimitKey(input.scope, input.subject);
    const prisma = getPrisma();
    // Keep old windows bounded for active subjects without requiring a separate cleanup job.
    await prisma.rateLimitBucket.deleteMany({ where: { keyHash, expiresAt: { lt: new Date() } } });
    const bucket = await prisma.rateLimitBucket.upsert({
      where: { keyHash_windowStartedAt: { keyHash, windowStartedAt } },
      update: { count: { increment: 1 }, expiresAt },
      create: { keyHash, windowStartedAt, windowSeconds: limit.windowSeconds, expiresAt, organizationId: input.organizationId, count: 1 },
    });
    if (bucket.count > limit.max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
      throw new RateLimitExceededError(retryAfterSeconds);
    }
    return { remaining: Math.max(0, limit.max - bucket.count), retryAfterSeconds: Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000)) };
  }

  async cleanupExpired(limit = 1000) {
    const take = Math.max(1, Math.min(Math.trunc(limit), 5000));
    const expired = await getPrisma().rateLimitBucket.findMany({
      where: { expiresAt: { lt: new Date() } },
      select: { id: true },
      orderBy: { expiresAt: "asc" },
      take,
    });
    if (!expired.length) return { count: 0 };
    return getPrisma().rateLimitBucket.deleteMany({ where: { id: { in: expired.map((bucket) => bucket.id) } } });
  }
}
