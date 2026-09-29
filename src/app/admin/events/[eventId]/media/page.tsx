import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { requireEventCapability } from "@/server/permissions/capabilities";
import { getPrisma } from "@/lib/prisma";
import { EventConfigSchema } from "@/schemas/event";
import { moderateMedia } from "./actions";

export default async function MediaPage({ params, searchParams }: { params: Promise<{ eventId: string }>; searchParams: Promise<{ status?: string }> }) {
  const user = await getCurrentUser(); if (!user) redirect("/login");
  const { eventId } = await params; const query = await searchParams;
  await requireEventCapability(user.id, eventId, "submissions.review");
  const event = await getPrisma().event.findUnique({ where: { id: eventId } }); if (!event) notFound();
  const status = ["PENDING", "APPROVED", "REJECTED", "HIDDEN"].includes(query.status || "") ? query.status as "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN" : undefined;
  const assets = await getPrisma().mediaAsset.findMany({ where: { eventId, ...(status ? { moderationStatus: status } : {}) }, include: { activityRun: { include: { activityInstance: true, participationEntry: { include: { team: true } } } } }, orderBy: { createdAt: "desc" }, take: 200 });
  const config = EventConfigSchema.parse(event.configJson);
  const counts = await getPrisma().mediaAsset.groupBy({ by: ["moderationStatus"], where: { eventId }, _count: { _all: true } });
  const countMap = new Map(counts.map((row) => [row.moderationStatus, row._count._all]));
  return <main><div className="page-heading"><div><h1>Media proof</h1><p className="muted">Participant uploads, moderation, and event-gallery visibility. Current event media policy: <strong>{config.privacy.mediaVisibility}</strong>.</p></div></div>
    <div className="stats-grid">{["PENDING", "APPROVED", "REJECTED", "HIDDEN"].map((key) => <a key={key} className="stat" href={`/admin/events/${eventId}/media?status=${key}`}><strong>{countMap.get(key as never) ?? 0}</strong><span>{key.toLowerCase()}</span></a>)}</div>
    <section className="card"><div className="section-heading"><div><h2>{status ? status.toLowerCase() : "All uploads"}</h2><p className="muted">Binary media is stored behind authenticated/event-policy routes; public gallery only renders approved items.</p></div>{status && <a className="button secondary" href={`/admin/events/${eventId}/media`}>Show all</a>}</div>
      <div className="media-review-grid">{assets.length === 0 ? <p className="muted">No uploads in this view.</p> : assets.map((asset) => <article className="media-review-card" key={asset.id}><div className="media-review-preview">{asset.kind === "IMAGE" ? <img src={`/api/media/${asset.id}`} alt="Participant proof"/> : asset.kind === "VIDEO" ? <video controls preload="metadata" src={`/api/media/${asset.id}`}/> : asset.kind === "AUDIO" ? <audio controls preload="metadata" src={`/api/media/${asset.id}`}/> : <a href={`/api/media/${asset.id}`} target="_blank" rel="noreferrer">Open file</a>}</div><div className="stack"><div className="row"><span className="badge">{asset.moderationStatus}</span><span className="tag">{asset.kind}</span></div><strong>{asset.activityRun?.activityInstance.title || "Unlinked activity"}</strong><span className="muted">{asset.activityRun?.participationEntry.team?.name || "Participant"} · {Math.round(asset.byteSize / 1024)} KB</span><small className="muted">{asset.createdAt.toLocaleString("en-PH", { timeZone: event.timezone })}</small><form action={moderateMedia} className="stack"><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="assetId" value={asset.id}/><label>Reason / note<input name="reason" placeholder="Optional audit note"/></label><div className="row"><button name="status" value="APPROVED">Approve</button><button className="secondary" name="status" value="REJECTED">Reject</button><button className="secondary" name="status" value="HIDDEN">Hide</button></div></form></div></article>)}</div>
    </section>
  </main>;
}
