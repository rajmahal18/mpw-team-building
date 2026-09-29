import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { requireEventCapability } from "@/server/permissions/capabilities";
import { getPrisma } from "@/lib/prisma";
import { ActivityDefinitionSchema } from "@/schemas/activity";
import { ActivityBuilder } from "@/features/activity-builder/ActivityBuilder";
import { publishVersion } from "../../actions";

export default async function ActivityDefinitionPage({ params }: { params: Promise<{ eventId: string; activityId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { eventId, activityId } = await params;
  await requireEventCapability(user.id, eventId, "activities.manage");
  await requireEventCapability(user.id, eventId, "answer_keys.view");
  const [activity, eventActivities] = await Promise.all([
    getPrisma().activityInstance.findUnique({ where: { id: activityId }, include: { sourceTemplate: true, versions: { orderBy: { version: "desc" } }, _count: { select: { runs: true, stationAssignments: true } } } }),
    getPrisma().activityInstance.findMany({ where: { eventId }, select: { id: true, title: true }, orderBy: { createdAt: "asc" } }),
  ]);
  if (!activity || activity.eventId !== eventId) notFound();
  const latest = activity.versions[0];
  const definition = latest ? ActivityDefinitionSchema.parse(latest.definitionJson) : null;

  return <main>
    <p><Link href={`/admin/events/${eventId}/activities`}>← Event activities</Link></p>
    <div className="page-heading"><div><div className="row"><h1>{activity.title}</h1><span className="badge">{activity.status}</span></div><p className="muted"><code>{activity.machineKey}</code>{activity.sourceTemplate ? ` · copied from ${activity.sourceTemplate.name}` : " · custom activity"}</p></div></div>
    <section className="card"><h2>Definition status</h2><div className="summary-grid"><div><dt>Versions</dt><dd>{activity.versions.length}</dd></div><div><dt>Published version</dt><dd>{activity.currentVersionId ? `v${activity.versions.find((v)=>v.id===activity.currentVersionId)?.version ?? "?"}` : "None"}</dd></div><div><dt>Runs</dt><dd>{activity._count.runs}</dd></div><div><dt>Station assignments</dt><dd>{activity._count.stationAssignments}</dd></div></div></section>
    {definition ? <ActivityBuilder eventId={eventId} activityInstanceId={activity.id} initialDefinition={definition} activities={eventActivities}/> : <section className="card"><p>No definition version exists.</p></section>}
    {latest && latest.state !== "PUBLISHED" && <section className="card"><div className="page-heading"><div><h2>Publish latest draft</h2><p className="muted">Publishing supersedes the previously published version but never mutates it. Existing runs remain pinned to their original definition version.</p></div><form action={publishVersion}><input type="hidden" name="eventId" value={eventId}/><input type="hidden" name="versionId" value={latest.id}/><button>Publish v{latest.version}</button></form></div></section>}
    <section className="card"><h2>Version history</h2><div className="table-wrap"><table><thead><tr><th>Version</th><th>State</th><th>Created</th><th>Published</th><th>Checksum</th></tr></thead><tbody>{activity.versions.map((version)=><tr key={version.id}><td>v{version.version}</td><td><span className="badge">{version.state}</span></td><td>{version.createdAt.toLocaleString()}</td><td>{version.publishedAt?.toLocaleString() ?? "—"}</td><td><code>{version.checksum.slice(0,12)}…</code></td></tr>)}</tbody></table></div></section>
  </main>;
}
