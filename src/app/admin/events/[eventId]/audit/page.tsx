import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { requireEventCapability } from "@/server/permissions/capabilities";
import { getPrisma } from "@/lib/prisma";

export default async function EventAuditPage({ params }: { params: Promise<{ eventId: string }> }) {
  const user = await getCurrentUser(); if (!user) redirect("/login");
  const { eventId } = await params; await requireEventCapability(user.id, eventId, "audit.view");
  const event = await getPrisma().event.findUnique({ where: { id: eventId }, select: { id: true, name: true, organizationId: true } });
  if (!event) notFound();
  const logs = await getPrisma().auditLog.findMany({ where: { eventId }, orderBy: { createdAt: "desc" }, take: 250 });
  return <main><div className="page-heading"><div><h1>Audit log</h1><p className="muted">Immutable operational history for {event.name}. Secrets and raw credentials are intentionally excluded from new audit records.</p></div><Link className="button secondary" href={`/admin/events/${eventId}/reports`}>Reports & exports</Link></div><section className="card"><div className="table-wrap"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Reason</th><th>Request</th></tr></thead><tbody>{logs.map((log)=><tr key={log.id}><td>{log.createdAt.toLocaleString()}</td><td>{log.actorType}{log.actorUserId ? ` · ${log.actorUserId.slice(0,8)}…` : ""}</td><td><code>{log.action}</code></td><td>{log.targetType} · {log.targetId.slice(0,12)}…</td><td>{log.reason || "—"}</td><td>{log.requestId ? <code>{log.requestId.slice(0,12)}…</code> : "—"}</td></tr>)}</tbody></table></div></section></main>;
}
