import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { requireEventCapability } from "@/server/permissions/capabilities";
import { getPrisma } from "@/lib/prisma";
import { addBlankActivity, saveActivityToLibrary } from "./actions";

export default async function EventActivitiesPage({ params }: { params: Promise<{ eventId: string }> }) {
  const user = await getCurrentUser(); if (!user) redirect("/login");
  const { eventId } = await params; await requireEventCapability(user.id, eventId, "activities.manage");
  const event = await getPrisma().event.findUnique({ where: { id: eventId }, include: { activities: { include: { sourceTemplate: true, versions: { orderBy: { version: "desc" } }, _count: { select: { runs: true, stationAssignments: true } } }, orderBy: { createdAt: "asc" } } } });
  if (!event) notFound();
  return <main>
    <div className="page-heading"><div><h1>Event activities</h1><p className="muted">Activities belong to this event. Library templates are copied, not linked live.</p></div><Link className="button" href={`/admin/events/${event.id}/library`}>Browse library</Link></div>
    <section className="card"><div className="section-heading"><div><h2>Add an activity</h2><p className="muted">Start from the library for the fastest setup, or create a blank activity when you need something custom.</p></div><Link className="button" href={`/admin/events/${event.id}/library`}>Browse activity library</Link></div><details className="secondary-details"><summary>Create a blank activity instead</summary><form action={addBlankActivity} className="grid details-body"><input type="hidden" name="eventId" value={event.id}/><label>Activity name<input name="title" required placeholder="e.g. Water Relay"/></label><div className="form-actions"><button>Create activity</button></div></form></details></section>
    {event.activities.length === 0 ? <section className="card"><p>No event activities yet. Start from the library or create a blank activity.</p></section> : <div className="list-stack">{event.activities.map((activity) => {
      const current = activity.versions.find((version) => version.id === activity.currentVersionId);
      const latest = activity.versions[0];
      return <article className="card" key={activity.id}><div className="page-heading"><div><div className="row"><h2>{activity.title}</h2><span className="badge">{activity.status}</span></div><p className="muted">{activity.sourceTemplate ? `Started from ${activity.sourceTemplate.name}` : "Custom activity"}</p></div><Link className="button secondary" href={`/admin/events/${event.id}/activities/${activity.id}`}>Edit activity</Link></div>
        <div className="summary-grid"><div><dt>Versions</dt><dd>{activity.versions.length}</dd></div><div><dt>Published</dt><dd>{current ? `v${current.version}` : "Not yet"}</dd></div><div><dt>Latest</dt><dd>{latest ? `v${latest.version} ${latest.state}` : "—"}</dd></div><div><dt>Runs</dt><dd>{activity._count.runs}</dd></div><div><dt>Stations</dt><dd>{activity._count.stationAssignments}</dd></div></div>
        {latest && <details><summary>Save current definition to organization library</summary><form action={saveActivityToLibrary} className="grid details-body"><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="activityInstanceId" value={activity.id}/><label>Template name<input name="name" defaultValue={activity.title} required/></label><label>Category<input name="categoryKey" placeholder="amazing-race / physical / custom ..."/></label><label>Tags<input name="tags" placeholder="comma, separated, tags"/></label><label className="full-span">Description<input name="description"/></label><div className="form-actions"><button className="secondary">Save reusable template</button></div></form></details>}
      </article>;
    })}</div>}
  </main>;
}
