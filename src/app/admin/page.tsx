import Link from "next/link";
import { DeleteEventButton } from "@/features/event-setup/DeleteEventButton";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { getPrisma } from "@/lib/prisma";
import { createEvent } from "./actions";
import { hasPlatformCapability } from "@/server/permissions/capabilities";
import { signOut } from "@/app/login/actions";

type EventListItem = { id: string; name: string; slug: string; state: string; roles: { capabilities: string[] }[] };

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [events, canCreate, canSecurity] = await Promise.all([
    getPrisma().event.findMany({ where: { archivedAt: null, roles: { some: { assignments: { some: { userAccountId: user.id } } } } }, include: { roles: { where: { assignments: { some: { userAccountId: user.id } } }, select: { capabilities: true } } }, orderBy: { createdAt: "desc" } }),
    hasPlatformCapability(user.id, "events.create"),
    hasPlatformCapability(user.id, "security.manage"),
  ]);
  const eventList = events as EventListItem[];
  const activeCount = eventList.filter((event) => ["READY", "LIVE", "PAUSED"].includes(event.state)).length;
  return <main>
    <div className="page-heading organizer-heading"><div><div className="eyebrow">Organizer workspace</div><h1>Events</h1><p className="muted">Build, rehearse and operate reusable team-building events.</p></div><div className="row"><span className="user-chip">{user.name}</span>{canSecurity && <Link className="button secondary" href="/admin/security">Security & privacy</Link>}<form action={signOut}><button className="secondary">Sign out</button></form></div></div>
    <div className="stats-grid compact-stats"><div className="stat"><strong>{eventList.length}</strong><span>accessible events</span></div><div className="stat"><strong>{activeCount}</strong><span>ready / live</span></div></div>
    {canCreate && <section className="card create-event-card"><div className="section-heading"><div><div className="eyebrow">Start simple</div><h2>Create an event</h2><p className="muted">Just give it a name. You can add the date, teams, activities, rules and branding after the event exists.</p></div></div><form action={createEvent} className="quick-create-form"><label>What is the event called?<input name="name" required autoFocus placeholder="e.g. MPW Team Building 2027"/></label><button>Create event</button></form><p className="form-hint">We’ll create the web address automatically. Nothing else is required yet.</p></section>}
    <section><div className="section-heading"><div><h2>Your events</h2><p className="muted">Open a workspace to configure or operate it.</p></div></div>{eventList.length === 0 ? <div className="empty-state"><strong>No events yet</strong><span>Create your first reusable event workspace above.</span></div> : <div className="event-card-grid">{eventList.map((event) => <article className="event-card" key={event.id}><div className="event-card-top"><span className={`status-dot state-${event.state.toLowerCase()}`} aria-hidden="true"/><span className="badge">{event.state}</span></div><div><h3>{event.name}</h3><code>{event.slug}</code></div><div className="event-card-actions"><Link className="button" href={`/admin/events/${event.id}`}>Open workspace</Link><Link className="text-link" href={`/e/${event.slug}`}>Participant view →</Link></div>{["DRAFT", "CONFIGURING", "CANCELLED"].includes(event.state) && event.roles.some((role) => role.capabilities.includes("event.configure")) && <DeleteEventButton eventId={event.id} name={event.name}/>}</article>)}</div>}</section>
  </main>;
}
