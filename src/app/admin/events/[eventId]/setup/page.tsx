import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { requireEventCapability } from "@/server/permissions/capabilities";
import { getPrisma } from "@/lib/prisma";
import { EventBrandingConfigSchema, EventConfigSchema } from "@/schemas/event";
import { formatDateTimeLocal } from "@/lib/timezone";
import { EventSettingsForm } from "@/features/event-setup/EventSettingsForm";

export default async function EventSetupPage({ params }: { params: Promise<{ eventId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { eventId } = await params;
  await requireEventCapability(user.id, eventId, "event.configure");
  const event = await getPrisma().event.findUnique({ where: { id: eventId } });
  if (!event) notFound();
  const config = EventConfigSchema.parse(event.configJson);
  const branding = EventBrandingConfigSchema.parse(event.brandingJson ?? {});

  return <main className="setup-main">
    <div className="page-heading"><div><div className="eyebrow">Step 1</div><h1>Set up the event</h1><p className="muted">Start with the basics. You do not need to configure the whole platform before moving on.</p></div><Link className="button secondary" href={`/admin/events/${event.id}/people`}>Next: Teams & people →</Link></div>
    <div className="setup-orientation notice"><strong>Keep it simple.</strong><span>Fill in what you know now, save once, then continue. Everything can be edited later.</span></div>
    <EventSettingsForm
      key={event.updatedAt.toISOString()}
      event={{ id:event.id, name:event.name, shortName:event.shortName ?? "", slug:event.slug, timezone:event.timezone, startsAt:formatDateTimeLocal(event.startsAt,event.timezone), endsAt:formatDateTimeLocal(event.endsAt,event.timezone) }}
      config={config}
      branding={branding}
    />
  </main>;
}
