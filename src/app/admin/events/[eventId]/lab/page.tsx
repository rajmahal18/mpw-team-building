import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { getPrisma } from "@/lib/prisma";
import { ActivityDefinitionSchema } from "@/schemas/activity";
import { requireEventCapability } from "@/server/permissions/capabilities";
import { addActivity, addTeam, publishVersion, recordMetricAndScore, saveDefinition, startTeamRun, submitGenericBlock, addStation, changeStationState, transitionEvent } from "../actions";
import { EventLifecycleService } from "@/server/services/event-lifecycle-service";

export default async function EventAdminPage({ params }: { params: Promise<{ eventId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { eventId } = await params;
  await requireEventCapability(user.id, eventId, "activities.manage");
  await requireEventCapability(user.id, eventId, "answer_keys.view");
  const event = await getPrisma().event.findUnique({
    where: { id: eventId },
    include: {
      teams: { orderBy: { createdAt: "asc" } },
      activities: { include: { versions: { orderBy: { version: "desc" } } }, orderBy: { createdAt: "asc" } },
      runs: { include: { participationEntry: { include: { team: true } }, scores: true, metrics: true, activityInstance: true }, orderBy: { createdAt: "desc" }, take: 20 },
      stations: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!event) notFound();

  return <main>
    <div className="row"><h1 style={{marginRight:"auto"}}>Engine lab</h1><span className="badge">{event.state}</span></div>
    <p className="muted">Raw Phase 3 proof controls for {event.name}. Keep this for debugging; normal organizer setup lives in the dedicated builder pages.</p>
    <section className="card"><h2>Event lifecycle</h2><div className="row">{new EventLifecycleService().nextStates(event.state).map(state => <form action={transitionEvent} key={state}><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="to" value={state}/><button className="secondary">Move to {state}</button></form>)}</div></section>

    <section className="card"><h2>Teams</h2><form action={addTeam} className="grid"><input type="hidden" name="eventId" value={event.id}/><label>Name<input name="name" required /></label><label>Machine key<input name="machineKey" required pattern="[a-z0-9_-]+" /></label><label>Color token<input name="colorToken" placeholder="team-blue / #1f6feb" /></label><label>Optional team code<input name="teamCode" minLength={4} /></label><div style={{alignSelf:"end"}}><button>Add team</button></div></form>
      <div className="grid">{event.teams.map(team => <div className="card" key={team.id}><strong>{team.name}</strong><div className="muted"><code>{team.machineKey}</code></div></div>)}</div>
    </section>

    <section className="card"><h2>Stations / checkpoints</h2><form action={addStation} className="grid"><input type="hidden" name="eventId" value={event.id}/><label>Name<input name="name" required /></label><label>Machine key<input name="machineKey" required pattern="[a-z0-9_-]+" /></label><label>Capacity<input name="capacity" type="number" min="1" /></label><div style={{alignSelf:"end"}}><button>Add station</button></div></form><div className="grid">{event.stations.map(station => <div className="card" key={station.id}><div className="row"><strong>{station.name}</strong><span className="badge">{station.status}</span></div><p className="muted"><code>{station.machineKey}</code>{station.capacity ? ` · cap ${station.capacity}` : ""}</p><div className="row">{(["READY","OPEN","PAUSED","CLOSED","DISABLED"] as const).filter(state => state !== station.status).map(state => <form action={changeStationState} key={state}><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="stationId" value={station.id}/><input type="hidden" name="to" value={state}/><button className="secondary">{state}</button></form>)}</div>{event.state === "LIVE" && station.status === "OPEN" && <p className="muted">Use the Control page to rotate/generate a database-backed checkpoint QR.</p>}</div>)}</div></section>

    <section className="card"><h2>Activities</h2><p className="muted">Activity names are data. The engine never branches on these names.</p><form action={addActivity} className="grid"><input type="hidden" name="eventId" value={event.id}/><label>Title<input name="title" required /></label><label>Machine key<input name="machineKey" required pattern="[a-z0-9_-]+" /></label><div style={{alignSelf:"end"}}><button>Add generic activity</button></div></form></section>

    {event.activities.map(activity => {
      const latest = activity.versions[0];
      const pretty = latest ? JSON.stringify(ActivityDefinitionSchema.parse(latest.definitionJson), null, 2) : "{}";
      return <section className="card" key={activity.id}>
        <div className="row"><h3 style={{marginRight:"auto"}}>{activity.title}</h3><code>{activity.machineKey}</code></div>
        {latest && <><p>Latest definition: v{latest.version} <span className="badge">{latest.state}</span></p><form action={saveDefinition} className="stack"><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="activityInstanceId" value={activity.id}/><label>Definition JSON<textarea name="definitionJson" defaultValue={pretty}/></label><button>Validate & save as new draft</button></form>{latest.state !== "PUBLISHED" && <form action={publishVersion} style={{marginTop:10}}><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="versionId" value={latest.id}/><button className="secondary">Publish v{latest.version}</button></form>}</>}
        {activity.currentVersionId && event.teams.length > 0 && <form action={startTeamRun} className="row" style={{marginTop:14}}><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="activityInstanceId" value={activity.id}/><select name="teamId" defaultValue={event.teams[0]?.id}>{event.teams.map(team => <option value={team.id} key={team.id}>{team.name}</option>)}</select><button>Start team run</button></form>}
      </section>;
    })}

    <section className="card"><h2>Recent runs</h2>{event.runs.length === 0 ? <p className="muted">No runs yet.</p> : event.runs.map(run => <div className="card" key={run.id}><div className="row"><strong>{run.activityInstance.title}</strong><span>{run.participationEntry.team?.name || run.participationEntry.label || run.participationEntry.kind}</span><span className="badge">{run.state}</span></div><div className="muted">Pinned definition: {run.activityDefinitionVersionId}</div><form action={recordMetricAndScore} className="row" style={{marginTop:10}}><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="runId" value={run.id}/><input name="metricKey" placeholder="metric key" required/><input name="value" placeholder="value" required/><button>Record metric + score</button></form><form action={submitGenericBlock} className="stack" style={{marginTop:10}}><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="runId" value={run.id}/><label>Generic block ID<input name="blockId" placeholder="completion" required/></label><label>Submission payload JSON<input name="payloadJson" defaultValue='{"optionId":"passed"}' required/></label><label>Idempotency key<input name="idempotencyKey" defaultValue={`${run.id}:manual-1`} required/></label><button className="secondary">Submit generic block</button></form>{run.metrics.length > 0 && <pre>{JSON.stringify(run.metrics.map(m => ({key:m.metricKey,value:m.valueJson})), null, 2)}</pre>}{run.scores.length > 0 && <pre>{JSON.stringify(run.scores.map(s => ({key:s.dimensionKey,amount:String(s.amount),type:s.entryType})), null, 2)}</pre>}</div>)}</section>
  </main>;
}
