import { logger } from "@/server/observability/logger";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    logger.info("application.started", { node: process.version, environment: process.env.NODE_ENV });
  }
}
