import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { requireEventCapability } from "@/server/permissions/capabilities";
import { getPrisma } from "@/lib/prisma";
import { StationConfigSchema } from "@/schemas/flow";
import { LiveRefresh } from "@/features/live-ops/LiveRefresh";
import { callNext, startVisit, completeVisit, skipVisit, rerouteVisit } from "./actions";
import { changeStationState } from "../actions";

const activeStates = ["CALLED", "ARRIVED", "ACTIVE"] as const;

function teamLabel(visit: { participationEntry: { label: string | null; team: { name: string } | null } }) {
  return visit.participationEntry.team?.name || visit.participationEntry.label || "Participant entry";
}

export default async function StationOperatePage({ params }: { params: Promise<{ eventId: string; stationId: string }> }) {
  const user = await getCurrentUser(); if (!user) redirect("/login");
  const { eventId, stationId } = await params; await requireEventCapability(user.id, eventId, "stations.operate");
  const station = await getPrisma().station.findUnique({ where: { id: stationId }, include: { event: true, activityAssignments: { orderBy: { sortOrder: "asc" }, include: { activity: true } }, staffAssignments: { where: { active: true }, include: { user: true } }, visits: { orderBy: [{ queuePosition: "asc" }, { createdAt: "desc" }], take: 80, include: { participationEntry: { include: { team: true } } } } } });
  if (!station || station.eventId !== eventId) notFound();
  const otherStations = await getPrisma().station.findMany({ where: { eventId, id: { not: station.id }, status: "OPEN" }, orderBy: { name: "asc" } });
  const config = StationConfigSchema.parse(station.configJson ?? {});
  const queue = station.visits.filter((visit) => visit.state === "QUEUED").sort((a,b)=>(a.queuePosition ?? 9999)-(b.queuePosition ?? 9999));
  const inStation = station.visits.filter((visit) => activeStates.includes(visit.state as any));
  const recent = station.visits.filter((visit) => ["COMPLETED","SKIPPED","REROUTED"].includes(visit.state)).slice(0, 15);

  return <main className="marshal-main">
    <div className="page-heading"><div><div className="row"><Link href={`/admin/events/${eventId}/stations`}>← Stations</Link><span className="badge">Marshal view</span></div><h1>{station.name}</h1><p className="muted">{config.locationLabel || "No location label"} · capacity {station.capacity ?? "∞"}</p></div><LiveRefresh seconds={8}/></div>

    <section className="card marshal-status"><div className="section-heading"><div><h2>Station status</h2><div className="row"><span className={`badge station-${station.status.toLowerCase()}`}>{station.status}</span><span>{queue.length} queued</span><span>{inStation.length} reserved/in station</span></div></div><div className="row">{station.status === "OPEN" ? <form action={changeStationState}><input type="hidden" name="eventId" value={eventId}/><input type="hidden" name="stationId" value={station.id}/><input type="hidden" name="to" value="PAUSED"/><button className="secondary">Pause station</button></form> : station.status === "PAUSED" ? <form action={changeStationState}><input type="hidden" name="eventId" value={eventId}/><input type="hidden" name="stationId" value={station.id}/><input type="hidden" name="to" value="OPEN"/><button>Resume station</button></form> : null}</div></div>{config.instructions && <div className="notice"><strong>Marshal instructions</strong><span>{config.instructions}</span></div>}{station.staffAssignments.length > 0 && <p className="muted">Assigned: {station.staffAssignments.map((assignment)=>assignment.user.name).join(", ")}</p>}</section>

    <section className="card"><div className="section-heading"><div><h2>Queue</h2><p className="muted">FIFO is the default. Manual mode lets the marshal decide when to call.</p></div>{queue.length > 0 && <form action={callNext}><input type="hidden" name="eventId" value={eventId}/><input type="hidden" name="stationId" value={station.id}/><input type="hidden" name="idempotencyKey" value={randomUUID()}/><button>Call next team</button></form>}</div>{queue.length === 0 ? <p className="muted">No teams waiting.</p> : <div className="queue-list">{queue.map((visit)=><div className="queue-row" key={visit.id}><strong>#{visit.queuePosition} · {teamLabel(visit)}</strong><span className="muted">Arrived {visit.checkedInAt?.toLocaleTimeString("en-PH", { timeZone: station.event.timezone, hour: "2-digit", minute: "2-digit" })}</span><div className="row"><form action={startVisit}><input type="hidden" name="eventId" value={eventId}/><input type="hidden" name="stationId" value={station.id}/><input type="hidden" name="visitId" value={visit.id}/><input type="hidden" name="idempotencyKey" value={randomUUID()}/><button className="secondary">Start now</button></form></div></div>)}</div>}</section>

    <section className="card"><h2>At this station</h2>{inStation.length === 0 ? <p className="muted">No active arrivals.</p> : <div className="marshal-cards">{inStation.map((visit)=><article className="subcard marshal-team" key={visit.id}><div className="section-heading"><div><strong>{teamLabel(visit)}</strong><div className="row"><span className="badge">{visit.state}</span>{visit.calledAt && <span className="muted">called {visit.calledAt.toLocaleTimeString("en-PH", { timeZone: station.event.timezone, hour: "2-digit", minute: "2-digit" })}</span>}</div></div></div><div className="row">{visit.state !== "ACTIVE" && <form action={startVisit}><input type="hidden" name="eventId" value={eventId}/><input type="hidden" name="stationId" value={station.id}/><input type="hidden" name="visitId" value={visit.id}/><input type="hidden" name="idempotencyKey" value={randomUUID()}/><button>Start</button></form>}<form action={completeVisit}><input type="hidden" name="eventId" value={eventId}/><input type="hidden" name="stationId" value={station.id}/><input type="hidden" name="visitId" value={visit.id}/><input type="hidden" name="idempotencyKey" value={randomUUID()}/><button>Complete</button></form></div><details><summary>Exception / override</summary><div className="list-stack details-body"><form action={skipVisit} className="row"><input type="hidden" name="eventId" value={eventId}/><input type="hidden" name="stationId" value={station.id}/><input type="hidden" name="visitId" value={visit.id}/><input type="hidden" name="idempotencyKey" value={randomUUID()}/><input name="reason" required placeholder="Reason for skip"/><button className="secondary">Skip</button></form>{otherStations.length > 0 && <form action={rerouteVisit} className="stack"><input type="hidden" name="eventId" value={eventId}/><input type="hidden" name="stationId" value={station.id}/><input type="hidden" name="visitId" value={visit.id}/><input type="hidden" name="idempotencyKey" value={randomUUID()}/><label>Fallback station<select name="targetStationId" required>{otherStations.map((target)=><option key={target.id} value={target.id}>{target.name}</option>)}</select></label><label>Reason<input name="reason" required placeholder="e.g. equipment unavailable"/></label><button className="secondary">Reroute team</button></form>}</div></details></article>)}</div>}</section>

    <section className="card"><h2>Activities here</h2>{station.activityAssignments.length ? <div className="list-stack">{station.activityAssignments.map((assignment)=><div className="notice" key={assignment.id}><strong>{assignment.sortOrder}. {assignment.activity.title}</strong><span className="muted">Activity execution uses the published generic activity definition; this station only references it.</span></div>)}</div> : <p className="muted">Check-in-only station.</p>}</section>

    <section className="card"><h2>Recent outcomes</h2>{recent.length ? <div className="table-wrap"><table><thead><tr><th>Team</th><th>State</th><th>Completed / changed</th></tr></thead><tbody>{recent.map((visit)=><tr key={visit.id}><td>{teamLabel(visit)}</td><td>{visit.state}</td><td>{(visit.completedAt || visit.skippedAt || visit.reroutedAt || visit.updatedAt).toLocaleTimeString("en-PH", { timeZone: station.event.timezone })}</td></tr>)}</tbody></table></div> : <p className="muted">No finished visits yet.</p>}</section>
  </main>;
}
