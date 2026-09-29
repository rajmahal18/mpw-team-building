import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getParticipantSession } from "@/server/auth/participant-session";
import { MediaService } from "@/server/services/media-service";
import { RateLimitExceededError, RateLimitService } from "@/server/services/rate-limit-service";
import { assertSameOrigin, clientFingerprintFromHeaders, requestId } from "@/server/security/request-security";
import { assertParticipantEventInteractive } from "@/server/security/participant-access";

export async function POST(request: Request) {
  const rid = requestId(request);
  try {
    assertSameOrigin(request);
    const form = await request.formData();
    const eventId = String(form.get("eventId") || "");
    const activityRunId = String(form.get("activityRunId") || "");
    const blockId = String(form.get("blockId") || "");
    const file = form.get("file");
    if (!eventId || !activityRunId || !blockId || !(file instanceof File)) throw new Error("Upload payload is incomplete");
    const session = await getParticipantSession(eventId);
    if (!session?.teamId) return NextResponse.json({ error: "Participant session required", requestId: rid }, { status: 401, headers: { "X-Request-Id": rid } });
    await new RateLimitService().consume({ scope: "media", subject: `session:${session.id}|ip:${clientFingerprintFromHeaders(request.headers)}` });
    const run = await getPrisma().activityRun.findUnique({ where: { id: activityRunId }, include: { participationEntry: true, event: { select: { state: true } } } });
    if (!run || run.eventId !== eventId || run.participationEntry.teamId !== session.teamId) return NextResponse.json({ error: "Activity run is not available to this team", requestId: rid }, { status: 403, headers: { "X-Request-Id": rid } });
    assertParticipantEventInteractive(run.event.state);
    if (run.state !== "IN_PROGRESS") return NextResponse.json({ error: "Activity run is not accepting media", requestId: rid }, { status: 409, headers: { "X-Request-Id": rid } });
    const asset = await new MediaService().createParticipantAsset({ eventId, activityRunId, blockId, participantSessionId: session.id, file });
    return NextResponse.json({ ok: true, asset: { id: asset.id, kind: asset.kind, mimeType: asset.mimeType, byteSize: asset.byteSize, moderationStatus: asset.moderationStatus }, requestId: rid }, { headers: { "X-Request-Id": rid } });
  } catch (error) {
    if (error instanceof RateLimitExceededError) return NextResponse.json({ error: error.message, requestId: rid }, { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds), "X-Request-Id": rid } });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to upload media", requestId: rid }, { status: 400, headers: { "X-Request-Id": rid } });
  }
}
