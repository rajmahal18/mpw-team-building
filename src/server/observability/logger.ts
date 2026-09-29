type Level = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

function sanitize(value: unknown): unknown {
  if (value instanceof Error) return { name: value.name, message: value.message, stack: process.env.NODE_ENV === "production" ? undefined : value.stack };
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sanitize);
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => {
    if (/password|secret|token|cookie|authorization|access.?code|private.?key/i.test(key)) return [key, "[REDACTED]"];
    return [key, sanitize(item)];
  }));
}

function write(level: Level, event: string, context: LogContext = {}) {
  const sanitized = sanitize(context) as LogContext;
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: "mpw-team-building",
    version: process.env.APP_VERSION || "1.0.0",
    event,
    ...sanitized,
  });
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.info(payload);
}

export const logger = {
  info: (event: string, context?: LogContext) => write("info", event, context),
  warn: (event: string, context?: LogContext) => write("warn", event, context),
  error: (event: string, context?: LogContext) => write("error", event, context),
};
