import { getPrisma } from "@/lib/prisma";
import { asInputJson } from "@/lib/json";

const REDACTED_KEY_TOKENS = new Set([
  "password",
  "passwordhash",
  "accesscode",
  "accesscodehash",
  "token",
  "tokenhash",
  "sessiontoken",
  "authorization",
  "cookie",
  "setcookie",
  "secret",
  "signingsecret",
  "clientsecret",
  "apikey",
  "privatekey",
  "refreshtoken",
  "csrftoken",
  "data",
]);

function normalizedKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function shouldRedactKey(key: string) {
  const normalized = normalizedKey(key);
  return REDACTED_KEY_TOKENS.has(normalized) || normalized.endsWith("password") || normalized.endsWith("secret") || normalized.endsWith("token") || normalized.endsWith("apikey") || normalized.endsWith("privatekey");
}

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[MAX_DEPTH]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return value.length > 20000 ? `${value.slice(0, 20000)}…[TRUNCATED]` : value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Uint8Array || Buffer.isBuffer(value)) return "[REDACTED_BINARY]";
  if (Array.isArray(value)) return value.map((item) => sanitize(item, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, shouldRedactKey(key) ? "[REDACTED]" : sanitize(item, depth + 1)]));
  }
  return value;
}

export class AuditService {
  async record(input: {
    organizationId: string;
    eventId?: string;
    actorUserId?: string;
    action: string;
    targetType: string;
    targetId: string;
    before?: unknown;
    after?: unknown;
    reason?: string;
    requestId?: string;
  }) {
    return getPrisma().auditLog.create({
      data: {
        organizationId: input.organizationId,
        eventId: input.eventId,
        actorType: input.actorUserId ? "USER" : "SYSTEM",
        actorUserId: input.actorUserId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        beforeJson: input.before === undefined ? undefined : asInputJson(sanitize(input.before)),
        afterJson: input.after === undefined ? undefined : asInputJson(sanitize(input.after)),
        reason: input.reason,
        requestId: input.requestId,
      },
    });
  }
}

export const sanitizeAuditValue = sanitize;
