import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { requireEventCapability } from "@/server/permissions/capabilities";
import { getPrisma } from "@/lib/prisma";

export default async function EventReportsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const user = await getCurrentUser(); if (!user) redirect("/login");
  const { eventId } = await params; await requireEventCapability(user.id, eventId, "reports.export");
  const event = await getPrisma().event.findUnique({ where: { id: eventId }, select: { id: true, name: true } });
  if (!event) notFound();
  const leaderboards = await getPrisma().leaderboardDefinition.findMany({ where: { eventId }, orderBy: { createdAt: "asc" }, select: { id: true, name: true } });
  const links = [
    ["participants", "Participant roster", "CSV of participant, team, role, join/check-in state"],
    ["scores", "Score ledger", "Append-only derived, placement, bonus, penalty and manual entries"],
    ["stations", "Station visits", "Queue, check-in, start, completion and reroute history"],
    ["audit", "Audit log", "Operational actions and corrections"],
  ] as const;
  return <main><div className="page-heading"><div><h1>Reports & exports</h1><p className="muted">Download machine-readable records for {event.name}. Every export request is logged.</p></div><Link className="button secondary" href={`/admin/events/${eventId}/audit`}>Audit log</Link></div><section className="card"><div className="action-grid">{links.map(([kind,title,description])=><a className="action-card" key={kind} href={`/api/admin/events/${eventId}/export?kind=${kind}`}><strong>{title}</strong><span>{description}</span><small>Download CSV</small></a>)}</div></section><section className="card"><h2>Leaderboards</h2>{leaderboards.length===0?<p className="muted">No leaderboard definitions yet.</p>:<div className="list-stack">{leaderboards.map((leaderboard)=><div className="subcard row" key={leaderboard.id}><strong>{leaderboard.name}</strong><a className="button secondary" href={`/api/admin/events/${eventId}/export?kind=leaderboard&leaderboardId=${encodeURIComponent(leaderboard.id)}`}>Download CSV</a></div>)}</div>}</section></main>;
}
