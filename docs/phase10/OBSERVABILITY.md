# Observability

Phase 10 introduces structured JSON server logging through `src/server/observability/logger.ts` and a startup event through Next.js instrumentation.

The logger recursively redacts keys that resemble passwords, secrets, tokens, cookies, authorization data, access codes and private keys.

## Minimum production signals

- application process/restart health;
- HTTP 5xx rate;
- `/api/health` availability;
- authenticated deep-health database latency;
- database connection saturation;
- storage/media failures;
- participant submission failure rate;
- backup run success and restore verification;
- security incident/audit review.

Infrastructure alert destinations are deployment-environment concerns and are deliberately not hardcoded into the application.
