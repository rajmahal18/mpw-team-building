import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { requireEventCapability } from "@/server/permissions/capabilities";
import { getPrisma } from "@/lib/prisma";
import { RouteService } from "@/server/services/route-service";
import { RouteStepConfigSchema } from "@/schemas/flow";
import { createRoute, addRouteStep, removeRouteStep, moveRouteStep, updateRouteStepSettings, assignRouteTeams, setRouteUnlockOverride } from "./actions";

export default async function RoutesPage({ params }: { params: Promise<{ eventId: string }> }) {
  const user = await getCurrentUser(); if (!user) redirect("/login");
  const { eventId } = await params; await requireEventCapability(user.id, eventId, "routes.manage");
  const event = await getPrisma().event.findUnique({ where: { id: eventId }, include: {
    teams: { where: { status: "ACTIVE" }, orderBy: { name: "asc" } },
    stations: { where: { status: { not: "DISABLED" } }, orderBy: { name: "asc" } },
    activities: { where: { status: "ACTIVE" }, orderBy: { title: "asc" } },
    routes: { orderBy: { createdAt: "asc" }, include: { steps: { orderBy: { sequence: "asc" }, include: { station: true, activity: true } }, assignments: { where: { active: true }, include: { team: true }, orderBy: { assignedAt: "desc" } } } },
  } });
  if (!event) notFound();
  const routeService = new RouteService();
  const progressByTeam = new Map<string, Awaited<ReturnType<RouteService["progressForTeam"]>>>();
  for (const team of event.teams) progressByTeam.set(team.id, await routeService.progressForTeam(event.id, team.id));

  return <main>
    <div className="page-heading"><div><h1>Route builder</h1><p className="muted">Routes are policies over generic station steps: fixed, free-roam, circular starting offsets, or per-team randomized order.</p></div><Link className="button secondary" href={`/admin/events/${event.id}/stations`}>← Stations</Link></div>

    <section className="card"><h2>Create route plan</h2><form action={createRoute} className="grid"><input type="hidden" name="eventId" value={event.id}/><label>Route name<input name="name" required placeholder="e.g. Main Route"/></label><label>Mode<select name="mode" defaultValue="CIRCULAR"><option value="FIXED">Fixed · same order for all teams</option><option value="CIRCULAR">Circular · same loop, different starting station</option><option value="RANDOMIZED">Randomized · frozen random order per team</option><option value="FREE">Free roam · stations available without sequence</option></select></label><div className="form-actions"><button>Create route</button></div></form></section>

    {event.routes.length === 0 ? <section className="card"><p className="muted">No route plans yet. Station-only events can still operate without a route.</p></section> : event.routes.map((route) => {
      const frozen = route.assignments.length > 0;
      return <section className="card" key={route.id}><div className="section-heading"><div><div className="row"><h2 style={{margin:0}}>{route.name}</h2><span className="badge">{route.mode}</span>{frozen && <span className="badge success-badge">Assigned snapshot frozen</span>}</div><p className="muted">{route.steps.length} stops · {route.assignments.length} assigned teams</p></div></div>

        <div className="route-flow">{route.steps.length === 0 ? <p className="muted">No steps. Add stations below.</p> : route.steps.map((step, index) => {
          const config = RouteStepConfigSchema.parse(step.configJson ?? {});
          const req = config.unlockRequirements[0];
          const reqType = req?.type ?? "NONE";
          const reqValue = req?.type === "STATION_COMPLETED" ? req.stationId : req?.type === "STEP_COMPLETED" ? req.routeStepId : req?.type === "MIN_COMPLETED" ? String(req.count) : req?.type === "MANUAL" ? req.key : "";
          return <div className="route-step" key={step.id}><div className="route-step-number">{index + 1}</div><div className="route-step-body"><div className="section-heading"><div><strong>{step.station?.name || step.activity?.title || "Unresolved step"}</strong><div className="row"><span className="tag">{config.unlockMode}</span><span className="tag">visibility {config.participantVisibility}</span>{config.optional && <span className="tag">optional</span>}</div></div>{!frozen && <div className="row"><form action={moveRouteStep}><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="routePlanId" value={route.id}/><input type="hidden" name="routeStepId" value={step.id}/><input type="hidden" name="direction" value="UP"/><button className="icon-button" disabled={index===0}>↑</button></form><form action={moveRouteStep}><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="routePlanId" value={route.id}/><input type="hidden" name="routeStepId" value={step.id}/><input type="hidden" name="direction" value="DOWN"/><button className="icon-button" disabled={index===route.steps.length-1}>↓</button></form><form action={removeRouteStep}><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="routePlanId" value={route.id}/><input type="hidden" name="routeStepId" value={step.id}/><button className="text-button danger-text">Remove</button></form></div>}</div>
          {!frozen && <details><summary>Unlock & visibility settings</summary><form action={updateRouteStepSettings} className="grid details-body"><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="routePlanId" value={route.id}/><input type="hidden" name="routeStepId" value={step.id}/><label>Unlock mode<select name="unlockMode" defaultValue={config.unlockMode}><option value="DEFAULT">Default for route mode</option><option value="ALWAYS">Always unlocked</option><option value="REQUIREMENTS">Requirement-driven</option></select></label><label>Requirement<select name="requirementType" defaultValue={reqType}><option value="NONE">None</option><option value="PREVIOUS_COMPLETED">Previous step completed</option><option value="STATION_COMPLETED">Specific station completed</option><option value="STEP_COMPLETED">Specific route step completed</option><option value="MIN_COMPLETED">Minimum completed steps</option><option value="MANUAL">Manual organizer unlock</option></select></label><label>Requirement value<input name="requirementValue" defaultValue={reqValue} placeholder="Station ID / step ID / count / key"/></label><label>Match<select name="requirementMatch" defaultValue={config.requirementMatch}><option value="ALL">All requirements</option><option value="ANY">Any requirement</option></select></label><label>Participant visibility<select name="participantVisibility" defaultValue={config.participantVisibility}><option value="WHEN_UNLOCKED">Show when unlocked</option><option value="ALWAYS">Always show</option><option value="AFTER_COMPLETED">Only reveal after completion</option></select></label><label className="check"><input name="optional" type="checkbox" defaultChecked={config.optional}/> Optional step</label><label className="full-span">Notes<input name="notes" defaultValue={config.notes ?? ""}/></label><div className="form-actions"><button>Save step policy</button></div></form></details>}</div></div>;
        })}</div>

        {!frozen ? <form action={addRouteStep} className="row subcard"><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="routePlanId" value={route.id}/><select name="stationId" defaultValue="" required><option value="" disabled>Add station step…</option>{event.stations.map((station)=><option value={station.id} key={station.id}>{station.name}</option>)}</select><button>Add step</button></form> : <div className="notice"><strong>Route structure is frozen after assignment.</strong><span>Create a new route plan for structural changes. Team snapshots preserve what was actually assigned.</span></div>}

        <div className="subcard"><h3>Assign to teams</h3><form action={assignRouteTeams} className="stack"><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="routePlanId" value={route.id}/><div className="check-grid">{event.teams.map((team)=><label className="check" key={team.id}><input type="checkbox" name="teamId" value={team.id}/>{team.name}</label>)}</div><label className="check"><input type="checkbox" name="allTeams"/> Assign/replace for all active teams</label><button disabled={route.steps.length===0}>Assign frozen route snapshots</button></form><p className="muted">Reassigning a team ends its previous active route assignment but keeps historical records.</p></div>

        {route.assignments.length > 0 && <div className="subcard"><h3>Assigned team progress</h3><div className="list-stack">{route.assignments.map((assignment) => {
          const progress = progressByTeam.get(assignment.teamId);
          const completed = progress?.steps.filter((step)=>step.completed || step.skipped).length ?? 0;
          return <div className="notice" key={assignment.id}><div className="section-heading"><div><strong>{assignment.team.name}</strong><span>{completed}/{progress?.steps.length ?? 0} route steps resolved</span></div></div>{progress && <div className="route-mini">{progress.steps.map((step)=><div className={`route-mini-step ${step.completed || step.skipped ? "done" : step.unlocked ? "open" : "locked"}`} key={step.routeStepId}><span>{step.sequence}</span><small>{step.completed ? "done" : step.skipped ? "skipped" : step.unlocked ? "open" : "locked"}</small>{!step.unlocked && !step.completed && <form action={setRouteUnlockOverride}><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="teamId" value={assignment.teamId}/><input type="hidden" name="routeStepId" value={step.routeStepId}/><input type="hidden" name="unlocked" value="true"/><input type="hidden" name="reason" value="Manual organizer unlock"/><button className="text-button">Unlock</button></form>}</div>)}</div>}</div>;
        })}</div></div>}
      </section>;
    })}
  </main>;
}
