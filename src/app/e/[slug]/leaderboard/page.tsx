import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { getParticipantSession } from "@/server/auth/participant-session";
import { EventConfigSchema } from "@/schemas/event";
import { LeaderboardDefinitionSchema } from "@/schemas/results";
import { isParticipantVisibleEventState } from "@/server/security/participant-access";
import { eventThemeStyle } from "@/lib/event-theme";

export default async function LeaderboardIndex({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getPrisma().event.findUnique({ where: { slug }, include: { leaderboards: { where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" } } } });
  if (!event || !isParticipantVisibleEventState(event.state)) notFound();
  const config = EventConfigSchema.parse(event.configJson);
  const session = await getParticipantSession(event.id);
  const allowed = config.leaderboard.enabled && (config.leaderboard.visibility === "PUBLIC" || (config.leaderboard.visibility === "PARTICIPANTS" && Boolean(session)));
  if (!allowed) return <main className="participant-field" style={eventThemeStyle(event.brandingJson)}><section className="card"><h1>Leaderboard unavailable</h1><p className="muted">This event does not expose standings to this viewer.</p></section></main>;
  const boards = event.leaderboards.filter((board) => LeaderboardDefinitionSchema.parse(board.configJson).visibility !== "HIDDEN");
  return <main className="participant-field" style={eventThemeStyle(event.brandingJson)}><div className="page-heading"><div><h1>{event.name} standings</h1><p className="muted">Choose a leaderboard.</p></div></div><div className="list-stack">{boards.map((board) => <Link key={board.id} className="action-card" href={`/e/${event.slug}/leaderboard/${board.id}`}><strong>{board.name}</strong><span>View standings →</span></Link>)}</div></main>;
}
