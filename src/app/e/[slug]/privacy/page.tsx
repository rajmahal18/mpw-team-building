import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { isParticipantVisibleEventState } from "@/server/security/participant-access";
import { eventThemeStyle } from "@/lib/event-theme";

export default async function EventPrivacyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getPrisma().event.findUnique({ where: { slug }, include: { privacyNotice: true } });
  if (!event || !isParticipantVisibleEventState(event.state)) notFound();
  return <main className="participant-field" style={eventThemeStyle(event.brandingJson)}><div className="page-heading"><div><h1>{event.privacyNotice?.title || "Privacy notice"}</h1><p className="muted">{event.name}</p></div><Link className="button secondary" href={`/e/${event.slug}`}>Back to event</Link></div><section className="card"><p className="muted">Version {event.privacyNotice?.version ?? "—"} · Effective {event.privacyNotice?.effectiveAt?.toLocaleDateString() || "not specified"}</p>{event.privacyNotice ? <div className="notice-copy">{event.privacyNotice.content.split(/\n+/).map((line, index)=><p key={index}>{line}</p>)}</div> : <p>No published privacy notice is attached to this event yet. Contact the organizer for the approved notice.</p>}</section></main>;
}
