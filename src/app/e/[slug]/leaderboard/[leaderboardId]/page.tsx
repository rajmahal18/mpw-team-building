import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { getParticipantSession } from "@/server/auth/participant-session";
import { EventConfigSchema } from "@/schemas/event";
import { LeaderboardDefinitionSchema } from "@/schemas/results";
import { LeaderboardService } from "@/server/services/leaderboard-service";
import { LiveRefresh } from "@/features/live-ops/LiveRefresh";
import { isParticipantVisibleEventState } from "@/server/security/participant-access";
import type { LiveStanding } from "@/engine/scoring/aggregate-ledger";
import { eventThemeStyle } from "@/lib/event-theme";

export default async function PublicLeaderboardPage({ params, searchParams }: { params: Promise<{ slug: string; leaderboardId: string }>; searchParams: Promise<{ projector?: string }> }) {
  const { slug, leaderboardId } = await params;
  const query = await searchParams;
  const board = await getPrisma().leaderboardDefinition.findFirst({ where: { id: leaderboardId, event: { slug } }, include: { event: true, snapshots: { orderBy: { revision: "desc" }, take: 10 } } });
  if (!board || !isParticipantVisibleEventState(board.event.state)) notFound();
  const eventConfig = EventConfigSchema.parse(board.event.configJson);
  const boardConfig = LeaderboardDefinitionSchema.parse(board.configJson);
  const session = await getParticipantSession(board.eventId);
  const allowed = eventConfig.leaderboard.enabled && boardConfig.visibility !== "HIDDEN" && (eventConfig.leaderboard.visibility === "PUBLIC" || (eventConfig.leaderboard.visibility === "PARTICIPANTS" && Boolean(session)));
  if (!allowed) return <main className="participant-field" style={eventThemeStyle(board.event.brandingJson)}><section className="card"><h1>Leaderboard unavailable</h1><p className="muted">Standings are not visible to this viewer.</p></section></main>;

  const mustUseFinal = eventConfig.leaderboard.mode === "FINAL_ONLY" || boardConfig.visibility === "FINAL_ONLY";
  const useSnapshot = mustUseFinal || eventConfig.leaderboard.mode === "DELAYED";
  let standings: LiveStanding[] = [];
  let sourceLabel = "Live";
  if (useSnapshot) {
    const snapshot = board.snapshots.find((item) => !mustUseFinal || item.state === "FINAL");
    standings = (snapshot?.standingsJson as unknown as LiveStanding[]) ?? [];
    sourceLabel = snapshot ? `${snapshot.state.toLowerCase()} · r${snapshot.revision}` : "No published snapshot yet";
  } else {
    standings = await new LeaderboardService().live(board.id);
  }
  if (eventConfig.leaderboard.topOnly) standings = standings.slice(0, eventConfig.leaderboard.topOnly);
  const projector = query.projector === "1";
  return <main className={projector ? "leaderboard-projector" : "participant-field"} style={eventThemeStyle(board.event.brandingJson)}>
    <div className="leaderboard-head"><div><small>{board.event.name}</small><h1>{board.name}</h1><p className="muted">{sourceLabel}</p></div>{!useSnapshot && <LiveRefresh seconds={8}/>}</div>
    <div className="public-standings">{standings.length === 0 ? <div className="card"><p className="muted">No standings published yet.</p></div> : standings.map((row) => <div className="standing-row" key={row.entryId}><span className="standing-rank">#{row.rank}</span><strong>{row.label}</strong>{!eventConfig.leaderboard.hideExactScores && <span className="standing-score">{formatScore(row.total)}</span>}</div>)}</div>
    {!projector && <div className="row leaderboard-actions"><a className="button secondary" href={`/e/${slug}`}>Event</a><a className="button secondary" href={`/e/${slug}/leaderboard/${board.id}?projector=1`}>Projector view</a></div>}
  </main>;
}
function formatScore(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(2); }
