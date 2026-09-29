import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { requireEventCapability } from "@/server/permissions/capabilities";
import { getPrisma } from "@/lib/prisma";
import { RouteService } from "@/server/services/route-service";
import { LiveRefresh } from "@/features/live-ops/LiveRefresh";
import { transitionEvent } from "../actions";
import { publishAnnouncement, retractAnnouncement, rerouteStationTraffic, bulkStationState } from "./actions";

const reservedStates = new Set(["CALLED","ARRIVED","ACTIVE"]);
const queueStates = new Set(["QUEUED"]);

export default async function LiveControlPage({ params }: { params: Promise<{ eventId: string }> }) {
  const user = await getCurrentUser(); if (!user) redirect("/login");
  const { eventId } = await params; await requireEventCapability(user.id, eventId, "event.read");
  const event = await getPrisma().event.findUnique({ where: { id: eventId }, include: {
    teams: { where: { status: "ACTIVE" }, orderBy: { name: "asc" } },
    stations: { orderBy: { name: "asc" }, include: { visits: { where: { state: { in: ["QUEUED","CALLED","ARRIVED","ACTIVE"] } }, include: { participationEntry: { include: { team: true } } } } } },
    announcements: { orderBy: { createdAt: "desc" }, take: 20 },
    domainEvents: { orderBy: { occurredAt: "desc" }, take: 12 },
  } });
  if (!event) notFound();
  const routeService = new RouteService();
  const teamProgress = await Promise.all(event.teams.map(async (team) => ({ team, progress: await routeService.progressForTeam(event.id, team.id) })));
  const activeAnnouncements = event.announcements.filter((a)=>a.status === "LIVE" && a.startsAt <= new Date() && (!a.expiresAt || a.expiresAt > new Date()));
  const totalQueued = event.stations.reduce((sum, station)=>sum + station.visits.filter((visit)=>queueStates.has(visit.state)).length, 0);
  const totalInStations = event.stations.reduce((sum, station)=>sum + station.visits.filter((visit)=>reservedStates.has(visit.state)).length, 0);

  return <main>
    <div className="page-heading"><div><div className="row"><h1>Live event control</h1><span className={`badge event-${event.state.toLowerCase()}`}>{event.state}</span></div><p className="muted">Operational overview for stations, queues, team progress, fallbacks, and announcements.</p></div><LiveRefresh seconds={10}/></div>

    <div className="stats-grid"><div className="stat"><strong>{event.teams.length}</strong><span>active teams</span></div><div className="stat"><strong>{event.stations.filter((s)=>s.status==="OPEN").length}</strong><span>open stations</span></div><div className="stat"><strong>{totalInStations}</strong><span>at stations</span></div><div className="stat"><strong>{totalQueued}</strong><span>queued teams</span></div><div className="stat"><strong>{activeAnnouncements.length}</strong><span>live announcements</span></div></div>

    <section className="card"><div className="section-heading"><div><h2>Event controls</h2><p className="muted">Pausing the event immediately blocks participant checkpoint check-ins while preserving all current state.</p></div></div><div className="row">{event.state === "LIVE" && <form action={transitionEvent}><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="to" value="PAUSED"/><button className="secondary">Pause event</button></form>}{event.state === "PAUSED" && <form action={transitionEvent}><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="to" value="LIVE"/><button>Resume event</button></form>}<form action={bulkStationState}><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="target" value="OPEN"/><button className="secondary">Open eligible stations</button></form><form action={bulkStationState}><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="target" value="PAUSED"/><button className="secondary">Pause all open stations</button></form></div></section>

    <section className="card"><div className="section-heading"><div><h2>Station load</h2><p className="muted">Capacity counts called + arrived + active teams as reserved slots. Queued teams wait outside that capacity.</p></div><Link className="button secondary" href={`/admin/events/${event.id}/stations`}>Station setup</Link></div><div className="ops-station-grid">{event.stations.map((station) => {
      const reserved = station.visits.filter((visit)=>reservedStates.has(visit.state)).length;
      const queued = station.visits.filter((visit)=>visit.state === "QUEUED").length;
      const congested = queued > 0 || (station.capacity != null && reserved >= station.capacity);
      return <article className={`subcard ops-station ${congested ? "congested" : ""}`} key={station.id}><div className="section-heading"><div><strong>{station.name}</strong><div className="row"><span className="badge">{station.status}</span>{congested && <span className="badge error-badge">Congested</span>}</div></div><Link href={`/admin/events/${event.id}/stations/${station.id}`}>Operate →</Link></div><div className="summary-grid"><div><dt>Reserved</dt><dd>{reserved}/{station.capacity ?? "∞"}</dd></div><div><dt>Queue</dt><dd>{queued}</dd></div></div>{station.visits.length > 0 && <p className="muted">{station.visits.slice(0,4).map((visit)=>visit.participationEntry.team?.name || visit.participationEntry.label || "Entry").join(", ")}{station.visits.length > 4 ? ` +${station.visits.length - 4}` : ""}</p>}{event.stations.filter((target)=>target.id!==station.id && target.status==="OPEN").length > 0 && station.visits.length > 0 && <details><summary>Emergency fallback / reroute all</summary><form action={rerouteStationTraffic} className="stack details-body"><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="fromStationId" value={station.id}/><input type="hidden" name="idempotencyKey" value={randomUUID()}/><label>Fallback station<select name="toStationId" required>{event.stations.filter((target)=>target.id!==station.id && target.status==="OPEN").map((target)=><option value={target.id} key={target.id}>{target.name}</option>)}</select></label><label>Reason<input name="reason" required placeholder="Weather / equipment / congestion"/></label><button className="secondary">Reroute all current traffic</button></form></details>}</article>;
    })}</div></section>

    <section className="card"><h2>Team route progress</h2><div className="list-stack">{teamProgress.map(({team, progress}) => <div className="notice" key={team.id}><div className="section-heading"><strong>{team.name}</strong>{progress ? <span>{progress.steps.filter((s)=>s.completed || s.skipped).length}/{progress.steps.length} resolved</span> : <span className="muted">No route assigned</span>}</div>{progress && <div className="route-mini">{progress.steps.map((step)=><div className={`route-mini-step ${step.completed||step.skipped?"done":step.unlocked?"open":"locked"}`} key={step.routeStepId}><span>{step.sequence}</span><small>{step.completed?"done":step.skipped?"skip":step.unlocked?"open":"lock"}</small></div>)}</div>}</div>)}</div></section>

    <section className="card"><div className="section-heading"><div><h2>Announcements</h2><p className="muted">Broadcast to everyone or target one team. Participant pages show only currently live messages.</p></div></div><form action={publishAnnouncement} className="grid"><input type="hidden" name="eventId" value={event.id}/><label>Title<input name="title" placeholder="Optional"/></label><label>Audience<select name="audienceKind" defaultValue="ALL"><option value="ALL">All participants</option><option value="TEAM">One team</option><option value="MARSHAL">Marshals/staff only</option></select></label><label>Team target<select name="audienceRefId" defaultValue=""><option value="">Only needed for team audience</option>{event.teams.map((team)=><option value={team.id} key={team.id}>{team.name}</option>)}</select></label><label>Expires<input name="expiresAt" type="datetime-local"/></label><label className="full-span">Message<textarea name="message" className="builder-prompt" required placeholder="Proceed to the covered court. Station 4 is temporarily closed."/></label><div className="form-actions"><button>Publish announcement</button></div></form><div className="list-stack">{event.announcements.map((announcement)=><div className="notice" key={announcement.id}><div className="section-heading"><div><strong>{announcement.title || "Announcement"}</strong><span>{announcement.message}</span><small className="muted">{announcement.audienceKind}{announcement.expiresAt ? ` · expires ${announcement.expiresAt.toLocaleString("en-PH", {timeZone:event.timezone})}` : ""}</small></div><div className="row"><span className="badge">{announcement.status}</span>{announcement.status === "LIVE" && <form action={retractAnnouncement}><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="announcementId" value={announcement.id}/><button className="text-button danger-text">Retract</button></form>}</div></div></div>)}</div></section>

    <section className="card"><h2>Recent operational events</h2>{event.domainEvents.length === 0 ? <p className="muted">No domain events yet.</p> : <div className="table-wrap"><table><thead><tr><th>Time</th><th>Event</th><th>Aggregate</th></tr></thead><tbody>{event.domainEvents.map((item)=><tr key={item.id}><td>{item.occurredAt.toLocaleTimeString("en-PH", {timeZone:event.timezone})}</td><td>{item.type}</td><td>{item.aggregateType} · <code>{item.aggregateId.slice(0,10)}</code></td></tr>)}</tbody></table></div>}</section>
  </main>;
}
