import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { getParticipantSession } from "@/server/auth/participant-session";
import { AnnouncementService } from "@/server/services/announcement-service";
import { RouteService } from "@/server/services/route-service";
import { ParticipantStatusBar } from "@/features/participant/ParticipantStatusBar";
import { EventConfigSchema } from "@/schemas/event";
import { LeaderboardDefinitionSchema } from "@/schemas/results";
import { LeaderboardService } from "@/server/services/leaderboard-service";
import { ParticipantEventCache } from "@/features/participant/ParticipantEventCache";
import { isParticipantVisibleEventState } from "@/server/security/participant-access";
import { eventThemeStyle } from "@/lib/event-theme";

export default async function ParticipantEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getPrisma().event.findFirst({ where: { slug }, include: { stations: { select: { id: true, name: true, status: true } }, leaderboards: { where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" } }, privacyNotice: { select: { id: true, version: true } } } });
  if (!event || !isParticipantVisibleEventState(event.state)) notFound();
  const config = EventConfigSchema.parse(event.configJson);
  const session = await getParticipantSession(event.id);
  const announcements = await new AnnouncementService().listLive(event.id, session?.teamId ?? undefined);
  const progress = session?.teamId ? await new RouteService().progressForTeam(event.id, session.teamId) : null;
  const stationMap = new Map(event.stations.map((station)=>[station.id, station]));
  const entry = session?.teamId ? await getPrisma().participationEntry.findFirst({ where: { eventId: event.id, teamId: session.teamId, kind: "TEAM" } }) : null;
  const activeVisit = entry ? await getPrisma().stationVisit.findFirst({ where: { participationEntryId: entry.id, state: { in: ["QUEUED", "CALLED", "ARRIVED", "ACTIVE"] } }, include: { station: { include: { activityAssignments: { orderBy: { sortOrder: "asc" }, include: { activity: true } } } } }, orderBy: { createdAt: "desc" } }) : null;
  const visibleBoard = event.leaderboards.find((board) => LeaderboardDefinitionSchema.parse(board.configJson).visibility !== "HIDDEN");
  let teamStanding: { rank: number; total: number } | null = null;
  if (entry && visibleBoard && config.leaderboard.enabled && config.leaderboard.visibility !== "STAFF_ONLY" && config.leaderboard.mode === "LIVE") {
    const standings = await new LeaderboardService().live(visibleBoard.id);
    const row = standings.find((item) => item.entryId === entry.id);
    if (row) teamStanding = { rank: row.rank, total: row.total };
  }
  const nextStep = progress?.steps.find((step) => step.visible && step.unlocked && !step.completed && !step.skipped);
  const currentMessage = activeVisit ? `${activeVisit.station.name}: ${activeVisit.state.toLowerCase().replaceAll("_", " ")}${activeVisit.state === "QUEUED" && activeVisit.queuePosition ? ` · queue #${activeVisit.queuePosition}` : ""}` : nextStep ? (nextStep.stationId ? `Next checkpoint: ${stationMap.get(nextStep.stationId)?.name || "checkpoint"}` : "Next activity is unlocked") : "No active task right now";
  const offlineRoute = progress?.steps.filter((step) => step.visible).map((step) => ({ sequence: step.sequence, label: step.stationId ? stationMap.get(step.stationId)?.name || "Checkpoint" : "Activity step", state: step.completed ? "Completed" : step.skipped ? "Skipped" : step.unlocked ? "Unlocked" : "Locked" })) ?? [];

  return <main className="participant-field" style={eventThemeStyle(event.brandingJson)}>
    {session && <ParticipantEventCache eventId={event.id} eventSlug={event.slug} eventName={event.name} teamName={session.team?.name || session.label || undefined} currentMessage={currentMessage} route={offlineRoute}/>}
    {session && <ParticipantStatusBar />}
    <div className="page-heading"><div><h1>{event.name}</h1><p className="muted">Event status: {event.state}</p></div>{session && <span className="badge">{session.team?.name || session.label}</span>}</div>
    {!session ? <div className="card"><p>This event supports account-optional participation.</p><Link className="button" href={`/e/${event.slug}/join`}>Join with team code</Link></div> : <div className="card"><div className="row"><strong>{session.team?.name || session.label}</strong><span className="badge">team session</span></div><p className="muted">Scan station QRs with your normal phone camera. Your event session is reused automatically.</p></div>}

    {announcements.length > 0 && <section className="card"><h2>Announcements</h2><div className="list-stack">{announcements.map((announcement)=><div className="notice participant-announcement" key={announcement.id}>{announcement.title && <strong>{announcement.title}</strong>}<span>{announcement.message}</span></div>)}</div></section>}

    {session && <section className="card participant-now"><h2>Right now</h2>{activeVisit ? <div className="stack"><div className="row"><strong>{activeVisit.station.name}</strong><span className="badge">{activeVisit.state}</span></div>{activeVisit.state === "QUEUED" && <div className="queue-ticket"><strong>Queue #{activeVisit.queuePosition}</strong><span>Stay nearby. The marshal will call your team.</span></div>}{activeVisit.state === "CALLED" && <div className="notice"><strong>Your team is called.</strong><span>Proceed to the station marshal.</span></div>}{["ARRIVED", "ACTIVE"].includes(activeVisit.state) && activeVisit.station.activityAssignments.length > 0 && <div className="action-grid">{activeVisit.station.activityAssignments.map((assignment) => <Link className="action-card" key={assignment.id} href={`/e/${event.slug}/activity/${assignment.activity.id}?stationId=${activeVisit.station.id}`}><strong>{assignment.activity.title}</strong><span>Open current activity →</span></Link>)}</div>}</div> : nextStep ? <div className="stack"><strong>{nextStep.stationId ? stationMap.get(nextStep.stationId)?.name || "Next checkpoint" : "Next activity"}</strong><span className="muted">{nextStep.stationId ? "Proceed there and scan the station QR with your phone camera." : "This activity is unlocked and ready."}</span>{!nextStep.stationId && nextStep.activityInstanceId && <Link className="button" href={`/e/${event.slug}/activity/${nextStep.activityInstanceId}`}>Open activity</Link>}</div> : <p className="muted">No active task right now. Follow the organizer or marshal announcement.</p>}</section>}

    <section className="card"><div className="row"><strong>Privacy</strong><Link className="button secondary" href={`/e/${event.slug}/privacy`}>View privacy notice{event.privacyNotice ? ` · v${event.privacyNotice.version}` : ""}</Link></div></section>

    {session && <section className="card participant-links"><h2>Event views</h2><div className="action-grid">{visibleBoard && config.leaderboard.enabled && config.leaderboard.visibility !== "STAFF_ONLY" && <Link className="action-card" href={`/e/${event.slug}/leaderboard/${visibleBoard.id}`}><strong>Leaderboard</strong><span>{teamStanding ? `You are #${teamStanding.rank}${config.leaderboard.hideExactScores ? "" : ` · ${teamStanding.total.toFixed(2)} pts`}` : "View event standings"}</span></Link>}{["PUBLIC", "EVENT_ONLY"].includes(config.privacy.mediaVisibility) && <Link className="action-card" href={`/e/${event.slug}/gallery`}><strong>Event gallery</strong><span>Approved team photos and media →</span></Link>}</div></section>}

    {session && <section className="card"><h2>Your route</h2>{progress ? <><p className="muted">Only stations configured as visible are revealed here. Hidden checkpoints stay hidden until their rule allows them.</p><div className="participant-route">{progress.steps.map((step) => {
      if (!step.visible) return <div className="participant-route-step hidden-step" key={step.routeStepId}><span>{step.sequence}</span><strong>Locked checkpoint</strong></div>;
      const station = step.stationId ? stationMap.get(step.stationId) : undefined;
      return <div className={`participant-route-step ${step.completed || step.skipped ? "done" : step.unlocked ? "open" : "locked"}`} key={step.routeStepId}><span>{step.sequence}</span><div><strong>{station?.name || "Activity step"}</strong><small>{step.completed ? "Completed" : step.skipped ? "Skipped" : step.unlocked ? station ? "Unlocked · scan its QR when you arrive" : "Unlocked · ready to open" : "Locked"}{station ? ` · station ${station.status.toLowerCase()}` : ""}</small>{step.unlocked && !station && step.activityInstanceId && !step.completed && !step.skipped && <Link className="button secondary route-open-button" href={`/e/${event.slug}/activity/${step.activityInstanceId}`}>Open activity</Link>}</div></div>;
    })}</div></> : <p className="muted">No route assigned. Follow organizer instructions and scan an open checkpoint QR when directed.</p>}</section>}
  </main>;
}
