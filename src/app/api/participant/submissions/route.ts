import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { getParticipantSession } from "@/server/auth/participant-session";
import { SubmissionService } from "@/server/services/submission-service";
import { RateLimitExceededError, RateLimitService } from "@/server/services/rate-limit-service";
import { assertSameOrigin, clientFingerprintFromHeaders, requestId } from "@/server/security/request-security";
import { assertParticipantEventInteractive } from "@/server/security/participant-access";

const BodySchema = z.object({
  eventId: z.string().min(1),
  activityRunId: z.string().min(1),
  blockId: z.string().min(1),
  payload: z.unknown(),
  idempotencyKey: z.string().min(8).max(200),
}).strict();

export async function POST(request: Request) {
  const rid = requestId(request);
  try {
    assertSameOrigin(request);
    const body = BodySchema.parse(await request.json());
    const session = await getParticipantSession(body.eventId);
    if (!session?.teamId) return NextResponse.json({ error: "Participant session required", requestId: rid }, { status: 401, headers: { "X-Request-Id": rid } });
    await new RateLimitService().consume({ scope: "submission", subject: `session:${session.id}|ip:${clientFingerprintFromHeaders(request.headers)}` });
    const run = await getPrisma().activityRun.findUnique({ where: { id: body.activityRunId }, include: { participationEntry: true, event: { select: { state: true } } } });
    if (!run || run.eventId !== body.eventId || run.participationEntry.teamId !== session.teamId) {
      return NextResponse.json({ error: "Activity run is not available to this team", requestId: rid }, { status: 403, headers: { "X-Request-Id": rid } });
    }
    assertParticipantEventInteractive(run.event.state);
    if (run.state !== "IN_PROGRESS") return NextResponse.json({ error: "Activity run is not accepting submissions", requestId: rid }, { status: 409, headers: { "X-Request-Id": rid } });
    const submission = await new SubmissionService().submit(body);
    const latestRun = await getPrisma().activityRun.findUnique({ where: { id: run.id }, select: { state: true, completedAt: true } });
    return NextResponse.json({ ok: true, submissionId: submission.id, status: submission.status, run: latestRun, requestId: rid }, { headers: { "X-Request-Id": rid } });
  } catch (error) {
    if (error instanceof RateLimitExceededError) return NextResponse.json({ error: error.message, requestId: rid }, { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds), "X-Request-Id": rid } });
    const message = error instanceof Error ? error.message : "Unable to submit";
    return NextResponse.json({ error: message, requestId: rid }, { status: 400, headers: { "X-Request-Id": rid } });
  }
}
