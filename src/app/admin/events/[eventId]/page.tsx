import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { requireEventCapability } from "@/server/permissions/capabilities";
import { getPrisma } from "@/lib/prisma";
import { EventConfigSchema } from "@/schemas/event";
import { EventPreflightService } from "@/server/services/event-preflight-service";
import { EventLifecycleService } from "@/server/services/event-lifecycle-service";
import { transitionEvent } from "./actions";

export default async function EventOverviewPage({ params }: { params: Promise<{ eventId: string }> }) {
  const user = await getCurrentUser(); if (!user) redirect("/login");
  const { eventId } = await params; await requireEventCapability(user.id, eventId, "event.read");
  const event = await getPrisma().event.findUnique({ where: { id: eventId }, include: {
    teams: { where: { status: "ACTIVE" }, select: { id: true } },
    participants: { where: { status: "ACTIVE" }, select: { id: true } },
    activities: { include: { versions: { orderBy: { version: "desc" } } } },
    stations: { select: { id: true, status: true } }, routes: { select: { id: true } }, competitions: { select: { id: true } },
  } });
  if (!event) notFound();
  const config = EventConfigSchema.parse(event.configJson);
  const definitions = event.activities.flatMap((activity) => {
    const version = activity.versions.find((v) => v.id === activity.currentVersionId) ?? activity.versions[0];
    return version ? [version.definitionJson] : [];
  });
  const preflight = new EventPreflightService().check({ eventConfig: event.configJson, activities: definitions, teamCount: event.teams.length });
  const nextStates = new EventLifecycleService().nextStates(event.state);

  return <main>
    <div className="page-heading"><div><h1>{event.name}</h1><p className="muted">Everything you need to prepare and run this event.</p></div><Link className="button secondary" href={`/e/${event.slug}`}>Participant page</Link></div>
    <div className="stats-grid"><div className="stat"><strong>{event.teams.length}</strong><span>{config.terminology.team}s</span></div><div className="stat"><strong>{event.participants.length}</strong><span>{config.terminology.participant}s</span></div><div className="stat"><strong>{event.activities.length}</strong><span>Activities</span></div><div className="stat"><strong>{event.stations.length}</strong><span>{config.terminology.station}s</span></div><div className="stat"><strong>{event.routes.length}</strong><span>Routes</span></div><div className="stat"><strong>{event.competitions.length}</strong><span>Competitions</span></div></div>

    <section className="card"><div className="section-heading"><div><h2>Build progress</h2><p className="muted">Follow the steps below. You can finish the rest later.</p></div><span className={`badge ${preflight.ok ? "success-badge" : ""}`}>{preflight.ok ? "Ready to continue" : "Needs attention"}</span></div>
      <div className="guided-build-flow"><div className="guided-step"><span>1</span><div><strong>Event settings</strong><p>Name, schedule and participant defaults.</p></div><Link className="button" href={`/admin/events/${event.id}/setup`}>Start here</Link></div><div className="guided-step"><span>2</span><div><strong>Teams & people</strong><p>Add teams and participants when you know the roster.</p></div><Link className="button secondary" href={`/admin/events/${event.id}/people`}>Open</Link></div><div className="guided-step"><span>3</span><div><strong>Activities</strong><p>Pick reusable activities, then customize only what this event needs.</p></div><Link className="button secondary" href={`/admin/events/${event.id}/library`}>Pick activities</Link></div><div className="guided-step"><span>4</span><div><strong>Stations & routes</strong><p>Build the field flow after activities and teams are ready.</p></div><Link className="button secondary" href={`/admin/events/${event.id}/stations`}>Build stations</Link></div></div><details className="advanced-workspace-links"><summary>More event tools</summary><div className="action-grid details-body"><Link className="action-card" href={`/admin/events/${event.id}/activities`}><strong>Customize activities</strong><span>Review event copies and publish definitions.</span></Link><Link className="action-card" href={`/admin/events/${event.id}/routes`}><strong>Routes</strong><span>Assign fixed, free, circular or randomized team paths.</span></Link><Link className="action-card" href={`/admin/events/${event.id}/control`}><strong>Live operations</strong><span>Queues, announcements and event pause/resume.</span></Link></div></details>
    </section>

    <section className="card"><div className="section-heading"><div><h2>Ready check</h2><p className="muted">We will flag anything that needs attention before the event goes live.</p></div></div>{preflight.issues.length === 0 ? <div className="notice success-notice"><strong>No blocking setup issues found.</strong><span>You can keep building the event and return here anytime.</span></div> : <div className="list-stack">{preflight.issues.map((issue, index)=><div className="notice" key={`${issue.code}-${index}`}><strong>{issue.level === "ERROR" ? "Needs fixing" : "Check this"}</strong><span>{issue.message}</span></div>)}</div>}</section>

    <section className="card"><div className="section-heading"><div><h2>Event status</h2><p className="muted">Change this only when you are ready to move the event forward.</p></div><span className={`badge state-badge state-${event.state.toLowerCase()}`}>{event.state}</span></div><div className="row lifecycle-actions">{nextStates.map((state)=><form action={transitionEvent} key={state}><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="to" value={state}/><button className={state === "LIVE" ? "" : "secondary"}>{state === "READY" ? "Mark ready" : state === "LIVE" ? "Start event" : state === "PAUSED" ? "Pause event" : state === "FINALIZED" ? "Finalize event" : state === "CANCELLED" ? "Cancel event" : `Change to ${state.toLowerCase()}`}</button></form>)}</div></section>
  </main>;
}
