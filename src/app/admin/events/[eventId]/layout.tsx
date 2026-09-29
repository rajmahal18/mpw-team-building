import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { requireEventCapability } from "@/server/permissions/capabilities";
import { getPrisma } from "@/lib/prisma";
import { EventOrganizerNav } from "@/features/navigation/EventOrganizerNav";

export default async function EventOrganizerLayout({ children, params }: { children: React.ReactNode; params: Promise<{ eventId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { eventId } = await params;
  await requireEventCapability(user.id, eventId, "event.read");
  const event = await getPrisma().event.findUnique({ where: { id: eventId }, select: { id: true, name: true, shortName: true, state: true, slug: true } });
  if (!event) notFound();

  const base = `/admin/events/${event.id}`;
  return <>
    <div className="event-shell-nav">
      <div className="event-shell-title">
        <div className="event-breadcrumb"><Link href="/admin">Events</Link><span aria-hidden="true">/</span><strong>{event.shortName || event.name}</strong></div>
        <div className="row"><span className={`badge state-badge state-${event.state.toLowerCase()}`}>{event.state}</span><Link className="text-link" href={`/e/${event.slug}`}>Participant view ↗</Link></div>
      </div>
      <EventOrganizerNav base={base}/>
    </div>
    {children}
  </>;
}
