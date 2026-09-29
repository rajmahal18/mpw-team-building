"use client";

import { useActionState, useEffect, useState } from "react";
import { updateEventSettings } from "@/app/admin/events/[eventId]/setup/actions";

type Props = {
  event: {
    id: string;
    name: string;
    shortName: string;
    slug: string;
    timezone: string;
    startsAt: string;
    endsAt: string;
  };
  config: {
    terminology: { team: string; participant: string; station: string; marshal: string; points: string };
    participation: { accountRequirement: string; deviceMode: string; allowLateJoin: boolean };
    leaderboard: { enabled: boolean; visibility: string; mode: string; topOnly?: number; hideExactScores: boolean };
    privacy: { eventVisibility: string; participantNameVisibility: string; mediaVisibility: string; retentionDays?: number };
    timing: { enforceSchedule: boolean; allowEarlyCheckInMinutes: number; allowLateJoin: boolean };
  };
  branding: {
    logoAssetId?: string;
    coverAssetId?: string;
    teamColorUsage?: string;
    themeTokens?: Record<string, string>;
  };
};

export function EventSettingsForm({ event, config, branding }: Props) {
  const [dirty, setDirty] = useState(false);
  const [saveState, saveAction, pending] = useActionState(updateEventSettings, { status: "idle" as const, message: "", revision: 0 });
  useEffect(() => { if (saveState.status === "success") setDirty(false); }, [saveState.revision, saveState.status]);
  return <form action={saveAction} className="event-settings-form" onInput={() => setDirty(true)} onChange={() => setDirty(true)}>
    <input type="hidden" name="eventId" value={event.id}/>

    <section className="card setup-primary-card">
      <div className="section-heading"><div><span className="step-kicker">Essential</span><h2>Event basics</h2><p className="muted">These are the only settings most organizers need at the start.</p></div></div>
      <div className="grid setup-basic-grid">
        <label>Event name<input name="name" defaultValue={event.name} required/></label>
        <label>Short name <span className="field-optional">Optional</span><input name="shortName" defaultValue={event.shortName}/></label>
        <label>Starts <span className="field-optional">Optional</span><input name="startsAt" type="datetime-local" defaultValue={event.startsAt}/></label>
        <label>Ends <span className="field-optional">Optional</span><input name="endsAt" type="datetime-local" defaultValue={event.endsAt}/></label>
      </div>
      <p className="form-hint">You can leave the schedule blank while you are still planning.</p>
    </section>

    <section className="card setup-next-card">
      <div className="section-heading"><div><span className="step-kicker">Usually enough</span><h2>How participants will use the event</h2><p className="muted">Friendly defaults are already selected. Change these only when your event needs something different.</p></div></div>
      <div className="grid">
        <label>Who can open the event?<select name="eventVisibility" defaultValue={config.privacy.eventVisibility}><option value="PRIVATE_LINK">Anyone with the link</option><option value="INVITE_ONLY">Invited participants only</option><option value="PUBLIC">Public</option></select></label>
        <label>Participant devices<select name="deviceMode" defaultValue={config.participation.deviceMode}><option value="EITHER">Either individual or shared team phone</option><option value="SHARED_TEAM">One shared phone per team</option><option value="INDIVIDUAL">Each participant uses a phone</option></select></label>
        <label>Participant accounts<select name="accountRequirement" defaultValue={config.participation.accountRequirement}><option value="OPTIONAL">Optional</option><option value="NONE">Not needed</option><option value="REQUIRED">Required</option></select></label>
      </div>
      <div className="check-grid setup-simple-checks">
        <label className="check"><input type="checkbox" name="allowLateJoin" defaultChecked={config.participation.allowLateJoin}/>Allow participants to join after the event starts</label>
        <label className="check"><input type="checkbox" name="leaderboardEnabled" defaultChecked={config.leaderboard.enabled}/>Show a leaderboard</label>
      </div>
    </section>

    <details className="card advanced-settings-card">
      <summary><span><strong>Advanced event settings</strong><small>Web address, timezone, terminology, leaderboard, privacy and timing</small></span></summary>
      <div className="details-body stack">
        <div className="notice setup-guidance"><strong>You can safely leave these alone.</strong><span>The defaults work for a normal team-building event. Open this section only when you know you need a change.</span></div>
        <h3>Technical identity</h3>
        <div className="grid">
          <label>Web address slug<input name="slug" defaultValue={event.slug} pattern="[a-z0-9_-]+" required/></label>
          <label>Timezone<input name="timezone" defaultValue={event.timezone} required/></label>
        </div>
        <h3>Words used in the app</h3>
        <div className="grid">
          <label>Team label<input name="termTeam" defaultValue={config.terminology.team} required/></label>
          <label>Participant label<input name="termParticipant" defaultValue={config.terminology.participant} required/></label>
          <label>Station label<input name="termStation" defaultValue={config.terminology.station} required/></label>
          <label>Marshal label<input name="termMarshal" defaultValue={config.terminology.marshal} required/></label>
          <label>Points label<input name="termPoints" defaultValue={config.terminology.points} required/></label>
        </div>
        <h3>Leaderboard & privacy</h3>
        <div className="grid">
          <label>Leaderboard visibility<select name="leaderboardVisibility" defaultValue={config.leaderboard.visibility}><option value="PUBLIC">Public</option><option value="PARTICIPANTS">Participants</option><option value="STAFF_ONLY">Staff only</option></select></label>
          <label>Leaderboard timing<select name="leaderboardMode" defaultValue={config.leaderboard.mode}><option value="LIVE">Live</option><option value="DELAYED">Delayed</option><option value="FINAL_ONLY">Final results only</option></select></label>
          <label>Show top N only <span className="field-optional">Optional</span><input name="topOnly" type="number" min="1" defaultValue={config.leaderboard.topOnly ?? ""}/></label>
          <label>Participant names<select name="participantNameVisibility" defaultValue={config.privacy.participantNameVisibility}><option value="EVENT_ONLY">Event participants</option><option value="PUBLIC">Public</option><option value="STAFF_ONLY">Staff only</option></select></label>
          <label>Media visibility<select name="mediaVisibility" defaultValue={config.privacy.mediaVisibility}><option value="EVENT_ONLY">Event participants</option><option value="PUBLIC">Public</option><option value="STAFF_ONLY">Staff only</option><option value="DISABLED">Disabled</option></select></label>
          <label>Retention days <span className="field-optional">Optional</span><input name="retentionDays" type="number" min="1" max="3650" defaultValue={config.privacy.retentionDays ?? ""}/></label>
        </div>
        <div className="check-grid">
          <label className="check"><input type="checkbox" name="hideExactScores" defaultChecked={config.leaderboard.hideExactScores}/>Hide exact leaderboard scores</label>
          <label className="check"><input type="checkbox" name="enforceSchedule" defaultChecked={config.timing.enforceSchedule}/>Enforce the event schedule</label>
          <label className="check"><input type="checkbox" name="timingAllowLateJoin" defaultChecked={config.timing.allowLateJoin}/>Timing rules allow late join</label>
        </div>
        <div className="grid"><label>Early check-in minutes<input name="allowEarlyCheckInMinutes" type="number" min="0" max="1440" defaultValue={config.timing.allowEarlyCheckInMinutes}/></label></div>
      </div>
    </details>

    <details className="card advanced-settings-card">
      <summary><span><strong>Branding & appearance</strong><small>Optional logo, cover and theme settings</small></span></summary>
      <div className="details-body stack">
        <div className="notice setup-guidance"><strong>Optional for later.</strong><span>The event works without custom branding.</span></div>
        <div className="grid">
          <label>Logo asset ID<input name="logoAssetId" defaultValue={branding.logoAssetId ?? ""}/></label>
          <label>Cover asset ID<input name="coverAssetId" defaultValue={branding.coverAssetId ?? ""}/></label>
          <label>Team color usage<select name="teamColorUsage" defaultValue={branding.teamColorUsage ?? "ACCENT"}><option value="NONE">None</option><option value="ACCENT">Accent</option><option value="PROMINENT">Prominent</option></select></label>
          <label>Accent token<input name="accent" defaultValue={branding.themeTokens?.accent ?? ""} placeholder="#176b5b"/></label>
          <label>Background token<input name="background" defaultValue={branding.themeTokens?.background ?? ""}/></label>
          <label>Surface token<input name="surface" defaultValue={branding.themeTokens?.surface ?? ""}/></label>
          <label>Text token<input name="text" defaultValue={branding.themeTokens?.text ?? ""}/></label>
        </div>
      </div>
    </details>

    <div className={`setup-savebar ${saveState.status === "error" ? "setup-savebar-error" : ""}`}><div><strong>Event settings</strong><span aria-live="polite">{pending ? "Saving changes…" : saveState.status === "error" ? saveState.message : dirty ? "Unsaved changes" : saveState.status === "success" ? saveState.message : "All changes saved"}</span></div><div className="row"><span className={`save-state ${saveState.status === "error" ? "save-state-error" : dirty ? "save-state-dirty" : "save-state-saved"}`}>{pending ? "Saving…" : saveState.status === "error" ? "Save failed" : dirty ? "Not saved yet" : "Saved"}</span><button disabled={pending || !dirty}>{pending ? "Saving…" : "Save changes"}</button></div></div>
  </form>;
}
