import { notFound, redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { getParticipantSession } from "@/server/auth/participant-session";
import { ParticipantActivityService } from "@/server/services/participant-activity-service";
import { ParticipantActivity } from "@/features/participant/ParticipantActivity";
import { isParticipantVisibleEventState } from "@/server/security/participant-access";
import { eventThemeStyle } from "@/lib/event-theme";

export default async function ParticipantActivityPage({ params, searchParams }: {
  params: Promise<{ slug: string; activityId: string }>;
  searchParams: Promise<{ stationId?: string }>;
}) {
  const { slug, activityId } = await params;
  const { stationId } = await searchParams;
  const event = await getPrisma().event.findFirst({ where: { slug } });
  if (!event || !isParticipantVisibleEventState(event.state)) notFound();
  const session = await getParticipantSession(event.id);
  if (!session?.teamId) redirect(`/e/${event.slug}/join?returnTo=${encodeURIComponent(`/e/${event.slug}/activity/${activityId}${stationId ? `?stationId=${stationId}` : ""}`)}`);
  try {
    const result = await new ParticipantActivityService().getOrStart({ eventId: event.id, teamId: session.teamId, activityInstanceId: activityId, stationId });
    return <div style={eventThemeStyle(event.brandingJson)}><ParticipantActivity eventId={event.id} eventSlug={event.slug} activityRunId={result.run.id} activityTitle={result.activity.title} projection={result.projection} completedBlockIds={result.run.submissions.map((submission) => submission.blockId)} existingMedia={result.run.mediaAssets.map((asset) => ({ id: asset.id, blockId: asset.blockId, kind: asset.kind, moderationStatus: asset.moderationStatus }))} runState={result.run.state}/></div>;
  } catch (error) {
    return <main className="participant-field" style={eventThemeStyle(event.brandingJson)}><section className="card"><h1>Activity unavailable</h1><p className="error">{error instanceof Error ? error.message : "This activity cannot be opened right now."}</p><a className="button secondary" href={`/e/${event.slug}`}>Back to event</a></section></main>;
  }
}
