import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getParticipantSession } from "@/server/auth/participant-session";
import { getCurrentUser } from "@/server/auth/session";
import { requireEventCapability } from "@/server/permissions/capabilities";
import { EventConfigSchema } from "@/schemas/event";

export async function GET(_request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const asset = await getPrisma().mediaAsset.findUnique({ where: { id: assetId }, include: { event: true } });
  if (!asset || asset.moderationStatus === "HIDDEN" || asset.moderationStatus === "REJECTED") return new NextResponse("Not found", { status: 404 });
  const config = EventConfigSchema.parse(asset.event.configJson);
  const publicAllowed = config.privacy.mediaVisibility === "PUBLIC" && asset.moderationStatus === "APPROVED";
  if (!publicAllowed) {
    const [participant, user] = await Promise.all([getParticipantSession(asset.eventId), getCurrentUser()]);
    const participantAllowed = Boolean(participant?.teamId && config.privacy.mediaVisibility === "EVENT_ONLY" && asset.moderationStatus === "APPROVED");
    if (participantAllowed) return mediaResponse(asset.data, asset.mimeType, asset.byteSize, asset.kind, true);
    if (user) {
      try {
        await requireEventCapability(user.id, asset.eventId, "submissions.review");
      } catch {
        return new NextResponse("Forbidden", { status: 403 });
      }
    } else {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }
  return mediaResponse(asset.data, asset.mimeType, asset.byteSize, asset.kind, asset.moderationStatus === "APPROVED");
}

function mediaResponse(data: Buffer | Uint8Array, mimeType: string, byteSize: number, kind: "IMAGE" | "VIDEO" | "AUDIO" | "FILE", cacheable: boolean) {
  const disposition = kind === "FILE" ? "attachment" : "inline";
  return new NextResponse(data, {
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(byteSize),
      "Cache-Control": cacheable ? "private, max-age=300" : "no-store",
      "Content-Disposition": `${disposition}; filename="media"`,
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
