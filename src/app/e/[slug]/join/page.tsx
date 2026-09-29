import { notFound, redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { joinTeam } from "./actions";
import { getParticipantSession } from "@/server/auth/participant-session";
import { isParticipantJoinableEventState } from "@/server/security/participant-access";
import { eventThemeStyle } from "@/lib/event-theme";

export default async function JoinPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string; returnTo?: string }> }) {
  const { slug } = await params;
  const query = await searchParams;
  const event = await getPrisma().event.findFirst({ where: { slug }, include: { teams: { where: { status: "ACTIVE" }, orderBy: { name: "asc" } } } });
  if (!event || !isParticipantJoinableEventState(event.state)) notFound();
  const existingSession = await getParticipantSession(event.id);
  if (existingSession) {
    const requestedReturnTo = query.returnTo || "";
    redirect(requestedReturnTo.startsWith(`/e/${event.slug}/`) ? requestedReturnTo : `/e/${event.slug}`);
  }
  return <main className="participant-field" style={eventThemeStyle(event.brandingJson)}><div className="card join-card"><h1>Join {event.name}</h1><p className="muted">No personal account required. Use the team code provided by the organizer.</p>{query.error && <p className="error">{query.error === "rate" ? "Too many attempts. Try again shortly." : query.error === "event" ? "This event is not accepting participant sessions." : "Could not join that team. Check the code."}</p>}<form action={joinTeam} className="stack"><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="slug" value={event.slug}/><input type="hidden" name="returnTo" value={query.returnTo || ""}/><label>Team<select name="teamId" required>{event.teams.map(team => <option value={team.id} key={team.id}>{team.name}</option>)}</select></label><label>Team code<input name="teamCode" required minLength={4} autoComplete="off" autoCorrect="off" autoCapitalize="characters" spellCheck={false}/></label><button>Enter event</button></form></div></main>;
}
