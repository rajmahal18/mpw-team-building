import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { requireEventCapability } from "@/server/permissions/capabilities";
import { getPrisma } from "@/lib/prisma";
import { EXPORT_KINDS, ReportExportService } from "@/server/services/report-export-service";
import { RateLimitExceededError, RateLimitService } from "@/server/services/rate-limit-service";
import { requestId } from "@/server/security/request-security";

export async function GET(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const rid = requestId(request);
  try {
    const user = await getCurrentUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401, headers: { "X-Request-Id": rid } });
    const { eventId } = await params;
    await requireEventCapability(user.id, eventId, "reports.export");
    await new RateLimitService().consume({ scope: "export", subject: `user:${user.id}` });
    const event = await getPrisma().event.findUniqueOrThrow({ where: { id: eventId }, select: { organizationId: true } });
    const url = new URL(request.url);
    const kind = url.searchParams.get("kind") as typeof EXPORT_KINDS[number] | null;
    if (!kind || !EXPORT_KINDS.includes(kind)) return new NextResponse("Invalid export kind", { status: 400, headers: { "X-Request-Id": rid } });
    const job = await new ReportExportService().create({ organizationId: event.organizationId, eventId, kind, requestedById: user.id, leaderboardId: url.searchParams.get("leaderboardId") || undefined });
    const output = await new ReportExportService().generate({ jobId: job.id, eventId, kind, leaderboardId: url.searchParams.get("leaderboardId") || undefined });
    return new NextResponse(output.content, { headers: { "Content-Type": output.mimeType, "Content-Disposition": `attachment; filename="${output.fileName.replaceAll('"', "")}"`, "Cache-Control": "no-store", "X-Request-Id": rid } });
  } catch (error) {
    if (error instanceof RateLimitExceededError) return new NextResponse(error.message, { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds), "X-Request-Id": rid } });
    return new NextResponse(error instanceof Error ? error.message : "Export failed", { status: 400, headers: { "X-Request-Id": rid } });
  }
}
