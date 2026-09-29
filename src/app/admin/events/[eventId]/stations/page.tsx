import Link from "next/link";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import QRCode from "qrcode";
import { getCurrentUser } from "@/server/auth/session";
import { requireEventCapability } from "@/server/permissions/capabilities";
import { getPrisma } from "@/lib/prisma";
import { StationConfigSchema } from "@/schemas/flow";
import { CheckpointCredentialService } from "@/server/services/checkpoint-credential-service";
import { createStation, updateStation, assignStationActivity, unassignStationActivity, changeStationState, rotateCheckpointQr, revokeCheckpointQr, assignStationStaff } from "./actions";

const nextStates: Record<string, string[]> = { DRAFT: ["READY", "DISABLED"], READY: ["DRAFT", "OPEN", "DISABLED"], OPEN: ["PAUSED", "CLOSED", "DISABLED"], PAUSED: ["OPEN", "CLOSED", "DISABLED"], CLOSED: ["OPEN"], DISABLED: ["READY"] };

export default async function StationsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const user = await getCurrentUser(); if (!user) redirect("/login");
  const { eventId } = await params; await requireEventCapability(user.id, eventId, "stations.manage");
  const event = await getPrisma().event.findUnique({ where: { id: eventId }, include: {
    activities: { where: { status: "ACTIVE" }, orderBy: { title: "asc" } },
    stations: { orderBy: [{ name: "asc" }], include: { activityAssignments: { orderBy: { sortOrder: "asc" }, include: { activity: true } }, checkpointCredentials: { where: { revokedAt: null }, orderBy: { createdAt: "desc" }, take: 1 }, staffAssignments: { where: { active: true }, include: { user: true } }, _count: { select: { visits: true } } } },
    roles: { include: { assignments: { include: { user: true } } } },
  } });
  if (!event) notFound();
  const staffMap = new Map<string, { id: string; name: string; email: string }>();
  for (const role of event.roles) for (const assignment of role.assignments) staffMap.set(assignment.user.id, assignment.user);
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const proto = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${proto}://${host}`;
  const credentialService = new CheckpointCredentialService();

  return <main>
    <div className="page-heading"><div><h1>Stations & checkpoints</h1><p className="muted">Build physical checkpoints, attach reusable activities, configure capacity, marshals, and rotatable QR entry.</p></div><Link className="button secondary" href={`/admin/events/${event.id}/routes`}>Route builder →</Link></div>

    <section className="card"><h2>Add station</h2><form action={createStation} className="grid"><input type="hidden" name="eventId" value={event.id}/><label>Machine key<input name="machineKey" placeholder="checkpoint-1" required/></label><label>Station name<input name="name" placeholder="Checkpoint 1" required/></label><label>Concurrent capacity<input name="capacity" type="number" min="1" placeholder="Unlimited if blank"/></label><label>Location label<input name="locationLabel" placeholder="Lobby / Covered Court"/></label><label className="full-span">Marshal instructions<textarea name="instructions" className="builder-prompt" placeholder="What the marshal needs to know..."/></label><label className="full-span">Participant arrival message<textarea name="participantMessage" className="builder-prompt" placeholder="What the team sees after scanning..."/></label><label>Queue policy<select name="queuePolicy" defaultValue="FIFO"><option value="FIFO">FIFO</option><option value="MANUAL">Manual calling</option></select></label><label className="check"><input type="checkbox" name="autoCallNext" defaultChecked/> Auto-call next queued team when capacity opens</label><label className="check"><input type="checkbox" name="allowWalkIn"/> Allow organizer walk-in override</label><div className="form-actions"><button>Add station</button></div></form></section>

    {event.stations.length === 0 ? <section className="card"><p className="muted">No stations yet. Add the first physical checkpoint above.</p></section> : <div className="list-stack">{await Promise.all(event.stations.map(async (station) => {
      const config = StationConfigSchema.parse(station.configJson ?? {});
      const credential = station.checkpointCredentials[0];
      let qrDataUrl: string | null = null; let checkpointUrl: string | null = null;
      if (credential && credential.expiresAt > new Date()) {
        try { const token = credentialService.tokenFor(credential); checkpointUrl = `${baseUrl}/e/${event.slug}/checkpoint/${encodeURIComponent(token)}`; qrDataUrl = await QRCode.toDataURL(checkpointUrl, { width: 220, margin: 1 }); } catch { qrDataUrl = null; }
      }
      return <section className="card" key={station.id}><div className="section-heading"><div><div className="row"><h2 style={{margin:0}}>{station.name}</h2><span className="badge">{station.status}</span></div><p className="muted"><code>{station.machineKey}</code>{config.locationLabel ? ` · ${config.locationLabel}` : ""} · capacity {station.capacity ?? "∞"} · {station._count.visits} visit records</p></div><Link className="button" href={`/admin/events/${event.id}/stations/${station.id}`}>Marshal view</Link></div>

        <details><summary>Edit station settings</summary><form action={updateStation} className="grid details-body"><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="stationId" value={station.id}/><label>Name<input name="name" defaultValue={station.name}/></label><label>Capacity<input name="capacity" type="number" min="1" defaultValue={station.capacity ?? ""}/></label><label>Location<input name="locationLabel" defaultValue={config.locationLabel ?? ""}/></label><label>Queue policy<select name="queuePolicy" defaultValue={config.queuePolicy}><option value="FIFO">FIFO</option><option value="MANUAL">Manual</option></select></label><label className="full-span">Instructions<textarea name="instructions" className="builder-prompt" defaultValue={config.instructions ?? ""}/></label><label className="full-span">Participant message<textarea name="participantMessage" className="builder-prompt" defaultValue={config.participantMessage ?? ""}/></label><label className="check"><input name="autoCallNext" type="checkbox" defaultChecked={config.autoCallNext}/> Auto-call next</label><label className="check"><input name="allowWalkIn" type="checkbox" defaultChecked={config.allowWalkIn}/> Allow walk-in override</label><div className="form-actions"><button>Save station</button></div></form></details>

        <div className="grid"><div className="subcard"><h3>Operations state</h3><div className="row">{(nextStates[station.status] ?? []).map((state) => <form action={changeStationState} key={state}><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="stationId" value={station.id}/><input type="hidden" name="to" value={state}/><button className="secondary">{state}</button></form>)}</div></div>

        <div className="subcard"><h3>Assigned activities</h3>{station.activityAssignments.length ? <div className="list-stack">{station.activityAssignments.map((assignment) => <div className="row" key={assignment.id}><span>{assignment.sortOrder}. {assignment.activity.title}</span><form action={unassignStationActivity}><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="stationId" value={station.id}/><input type="hidden" name="activityInstanceId" value={assignment.activityInstanceId}/><button className="text-button danger-text">Remove</button></form></div>)}</div> : <p className="muted">No activity attached. A station may also be check-in-only.</p>}<form action={assignStationActivity} className="row"><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="stationId" value={station.id}/><select name="activityInstanceId" required defaultValue=""><option value="" disabled>Add activity…</option>{event.activities.map((activity)=><option value={activity.id} key={activity.id}>{activity.title}</option>)}</select><input name="sortOrder" type="number" defaultValue={station.activityAssignments.length + 1} min="0" style={{width:90}}/><button>Add</button></form></div>

        <div className="subcard"><h3>Marshal assignment</h3>{station.staffAssignments.length ? <p>{station.staffAssignments.map((a)=>`${a.user.name} (${a.roleKey})`).join(", ")}</p> : <p className="muted">No specific marshal assigned; users with station-operation capability can still operate it.</p>}<form action={assignStationStaff} className="row"><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="stationId" value={station.id}/><select name="userAccountId" required defaultValue=""><option value="" disabled>Select event staff…</option>{[...staffMap.values()].map((staff)=><option value={staff.id} key={staff.id}>{staff.name} · {staff.email}</option>)}</select><input name="roleKey" defaultValue="marshal" style={{maxWidth:140}}/><button>Assign</button></form></div>

        <div className="subcard qr-panel"><h3>Checkpoint QR</h3>{credential && checkpointUrl ? <><div className="qr-layout">{qrDataUrl ? <img src={qrDataUrl} alt={`QR code for ${station.name}`} width={220} height={220}/> : <div className="notice">QR preview unavailable until the QR package and signing secret are configured.</div>}<div><p><strong>Active credential</strong></p><p className="muted">Expires {credential.expiresAt.toLocaleString("en-PH", { timeZone: event.timezone })}</p><p className="break-all"><code>{checkpointUrl}</code></p><form action={revokeCheckpointQr}><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="credentialId" value={credential.id}/><button className="secondary">Revoke QR</button></form></div></div></> : <p className="muted">No active QR credential. Generate one when the station setup is ready.</p>}<form action={rotateCheckpointQr} className="row"><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="stationId" value={station.id}/><input name="label" placeholder="Printed set / Day 1"/><input name="expiresAt" type="datetime-local"/><button>{credential ? "Rotate QR" : "Generate QR"}</button></form><p className="muted">Rotating immediately revokes the prior credential. The station state still controls whether scans are accepted.</p></div></div>
      </section>;
    }))}</div>}
  </main>;
}
