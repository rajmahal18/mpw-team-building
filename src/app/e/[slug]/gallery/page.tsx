import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { getParticipantSession } from "@/server/auth/participant-session";
import { EventConfigSchema } from "@/schemas/event";
import { ParticipantStatusBar } from "@/features/participant/ParticipantStatusBar";
import { isParticipantVisibleEventState } from "@/server/security/participant-access";
import { eventThemeStyle } from "@/lib/event-theme";

export default async function EventGallery({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getPrisma().event.findUnique({ where: { slug } });
  if (!event || !isParticipantVisibleEventState(event.state)) notFound();
  const config = EventConfigSchema.parse(event.configJson);
  const session = await getParticipantSession(event.id);
  const allowed = config.privacy.mediaVisibility === "PUBLIC" || (config.privacy.mediaVisibility === "EVENT_ONLY" && Boolean(session));
  if (!allowed) return <main className="participant-field" style={eventThemeStyle(event.brandingJson)}><section className="card"><h1>Gallery unavailable</h1><p className="muted">This event does not expose participant media to this viewer.</p></section></main>;
  const assets = await getPrisma().mediaAsset.findMany({ where: { eventId: event.id, moderationStatus: "APPROVED" }, include: { activityRun: { include: { activityInstance: true, participationEntry: { include: { team: true } } } } }, orderBy: { createdAt: "desc" }, take: 120 });
  return <main className="participant-field" style={eventThemeStyle(event.brandingJson)}>{session && <ParticipantStatusBar/>}<div className="page-heading"><div><h1>{event.name} gallery</h1><p className="muted">Only organizer-approved event media appears here.</p></div></div><div className="participant-gallery">{assets.length === 0 ? <section className="card"><p className="muted">No approved media yet.</p></section> : assets.map((asset) => <figure key={asset.id} className="gallery-item">{asset.kind === "IMAGE" ? <img loading="lazy" src={`/api/media/${asset.id}`} alt="Event activity proof"/> : <a className="gallery-file" href={`/api/media/${asset.id}`} target="_blank" rel="noreferrer">Open {asset.kind.toLowerCase()}</a>}<figcaption><strong>{asset.activityRun?.participationEntry.team?.name || "Participant"}</strong><span>{asset.activityRun?.activityInstance.title || "Activity"}</span></figcaption></figure>)}</div></main>;
}
