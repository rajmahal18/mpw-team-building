import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { getParticipantSession } from "@/server/auth/participant-session";
import { StationService } from "@/server/services/station-service";
import { verifyCheckpointToken, type CheckpointTokenPayload } from "@/server/security/checkpoint-token";
import { StationConfigSchema } from "@/schemas/flow";
import { eventThemeStyle } from "@/lib/event-theme";

export default async function CheckpointPage({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params;
  const payload = verifiedPayloadOrNotFound(token);
  const event = await getPrisma().event.findFirst({ where: { id: payload.eventId, slug } });
  if (!event) notFound();
  const session = await getParticipantSession(event.id);
  const returnTo = `/e/${slug}/checkpoint/${encodeURIComponent(token)}`;
  if (!session?.teamId) redirect(`/e/${slug}/join?returnTo=${encodeURIComponent(returnTo)}`);

  try {
    const result = await new StationService().checkInWithToken({ token, eventId: event.id, teamId: session.teamId });
    const config = StationConfigSchema.parse(result.station.configJson ?? {});
    const assignments = await getPrisma().stationActivityAssignment.findMany({ where: { stationId: result.station.id }, orderBy: { sortOrder: "asc" }, include: { activity: true } });
    const queued = result.visit.state === "QUEUED";
    return <main className="participant-field" style={eventThemeStyle(event.brandingJson)}><section className="card checkpoint-success"><span className="badge">{queued ? "Queued" : "Checked in"}</span><h1>{result.station.name}</h1><p><strong>{result.team.name}</strong></p>{queued ? <div className="queue-ticket"><strong>Queue #{result.visit.queuePosition}</strong><span>Please wait for the marshal to call your team.</span></div> : <p>Your team has a reserved place at this station.</p>}{config.participantMessage && <div className="notice"><span>{config.participantMessage}</span></div>}{!queued && assignments.length > 0 && <div><h2>Activities at this station</h2><div className="list-stack">{assignments.map((assignment)=><Link className="action-card" key={assignment.id} href={`/e/${event.slug}/activity/${assignment.activity.id}?stationId=${result.station.id}`}><strong>{assignment.sortOrder}. {assignment.activity.title}</strong><span>Open activity →</span></Link>)}</div></div>}<p className="muted">Rescanning this QR is safe; the same credential does not create a duplicate visit.</p><Link className="button secondary" href={`/e/${event.slug}`}>Event progress</Link></section></main>;
  } catch (error) {
    return <main className="participant-field" style={eventThemeStyle(event.brandingJson)}><section className="card"><h1>Checkpoint unavailable</h1><p className="error">{error instanceof Error ? error.message : "Unable to check in."}</p><p className="muted">Follow the organizer or marshal instructions. Your existing event session is still active.</p><Link className="button secondary" href={`/e/${event.slug}`}>Back to event</Link></section></main>;
  }
}

function verifiedPayloadOrNotFound(token: string): CheckpointTokenPayload {
  try { return verifyCheckpointToken(token); } catch { return notFound(); }
}
