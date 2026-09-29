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
  const [saveState, saveAction, pending] = useActionState(updateEventSettings, {
    status: "idle" as const,
    message: "",
    revision: 0,
  });

  useEffect(() => {
    if (saveState.status === "success") setDirty(false);
  }, [saveState.revision, saveState.status]);

  const stateText = pending
    ? "Saving changes…"
    : saveState.status === "error"
      ? saveState.message
      : dirty
        ? "Unsaved changes"
        : saveState.status === "success"
          ? saveState.message
          : "All changes saved";

  return (
    <form action={saveAction} className="event-settings-form" onInput={() => setDirty(true)} onChange={() => setDirty(true)}>
      <input type="hidden" name="eventId" value={event.id} />

      <section className="card setup-primary-card">
        <div className="section-heading">
          <div>
            <span className="step-kicker">Essentials</span>
            <h2>Event details</h2>
            <p>Set the name and schedule. You can leave anything optional blank for now.</p>
          </div>
        </div>
        <div className="grid setup-basic-grid">
          <label>
            Event name
            <input name="name" defaultValue={event.name} required />
          </label>
          <label>
            Short name <span className="field-optional">Optional</span>
            <input name="shortName" defaultValue={event.shortName} placeholder="Shown in tighter spaces" />
          </label>
          <label>
            Starts <span className="field-optional">Optional</span>
            <input name="startsAt" type="datetime-local" defaultValue={event.startsAt} />
          </label>
          <label>
            Ends <span className="field-optional">Optional</span>
            <input name="endsAt" type="datetime-local" defaultValue={event.endsAt} />
          </label>
        </div>
      </section>

      <section className="card setup-next-card">
        <div className="section-heading">
          <div>
            <span className="step-kicker">Participant access</span>
            <h2>How people will join</h2>
            <p>The defaults work for most team-building events. Change only what applies.</p>
          </div>
        </div>
        <div className="grid">
          <label>
            Event access
            <select name="eventVisibility" defaultValue={config.privacy.eventVisibility}>
              <option value="PRIVATE_LINK">Anyone with the event link</option>
              <option value="INVITE_ONLY">Invited participants only</option>
              <option value="PUBLIC">Publicly discoverable</option>
            </select>
          </label>
          <label>
            Device setup
            <select name="deviceMode" defaultValue={config.participation.deviceMode}>
              <option value="EITHER">Either shared or individual phones</option>
              <option value="SHARED_TEAM">One shared phone per team</option>
              <option value="INDIVIDUAL">Each participant uses a phone</option>
            </select>
          </label>
          <label>
            Accounts
            <select name="accountRequirement" defaultValue={config.participation.accountRequirement}>
              <option value="OPTIONAL">Optional</option>
              <option value="NONE">Not required</option>
              <option value="REQUIRED">Required</option>
            </select>
          </label>
        </div>
        <div className="check-grid setup-simple-checks">
          <label className="check">
            <input type="checkbox" name="allowLateJoin" defaultChecked={config.participation.allowLateJoin} />
            Allow joining after the event starts
          </label>
          <label className="check">
            <input type="checkbox" name="leaderboardEnabled" defaultChecked={config.leaderboard.enabled} />
            Enable leaderboard
          </label>
        </div>
      </section>

      <div className="settings-disclosure-group">
        <details className="advanced-settings-card">
          <summary>
            <span>
              <strong>Advanced event settings</strong>
              <small>Web address, wording, leaderboard, privacy and timing</small>
            </span>
          </summary>
          <div className="details-body stack">
            <h3>Event identity</h3>
            <div className="grid">
              <label>
                Event web address
                <input name="slug" defaultValue={event.slug} pattern="[a-z0-9_-]+" required />
              </label>
              <label>
                Timezone
                <input name="timezone" defaultValue={event.timezone} required />
              </label>
            </div>

            <h3>Words used in the app</h3>
            <div className="grid">
              <label>Team<input name="termTeam" defaultValue={config.terminology.team} required /></label>
              <label>Participant<input name="termParticipant" defaultValue={config.terminology.participant} required /></label>
              <label>Station<input name="termStation" defaultValue={config.terminology.station} required /></label>
              <label>Marshal<input name="termMarshal" defaultValue={config.terminology.marshal} required /></label>
              <label>Points<input name="termPoints" defaultValue={config.terminology.points} required /></label>
            </div>

            <h3>Leaderboard & privacy</h3>
            <div className="grid">
              <label>
                Leaderboard access
                <select name="leaderboardVisibility" defaultValue={config.leaderboard.visibility}>
                  <option value="PUBLIC">Public</option>
                  <option value="PARTICIPANTS">Participants only</option>
                  <option value="STAFF_ONLY">Staff only</option>
                </select>
              </label>
              <label>
                Leaderboard updates
                <select name="leaderboardMode" defaultValue={config.leaderboard.mode}>
                  <option value="LIVE">Live</option>
                  <option value="DELAYED">Delayed</option>
                  <option value="FINAL_ONLY">Final results only</option>
                </select>
              </label>
              <label>
                Show only the top <span className="field-optional">Optional</span>
                <input name="topOnly" type="number" min="1" defaultValue={config.leaderboard.topOnly ?? ""} placeholder="Show everyone" />
              </label>
              <label>
                Participant name visibility
                <select name="participantNameVisibility" defaultValue={config.privacy.participantNameVisibility}>
                  <option value="EVENT_ONLY">Event participants</option>
                  <option value="PUBLIC">Public</option>
                  <option value="STAFF_ONLY">Staff only</option>
                </select>
              </label>
              <label>
                Media visibility
                <select name="mediaVisibility" defaultValue={config.privacy.mediaVisibility}>
                  <option value="EVENT_ONLY">Event participants</option>
                  <option value="PUBLIC">Public</option>
                  <option value="STAFF_ONLY">Staff only</option>
                  <option value="DISABLED">Disabled</option>
                </select>
              </label>
              <label>
                Retention period in days <span className="field-optional">Optional</span>
                <input name="retentionDays" type="number" min="1" max="3650" defaultValue={config.privacy.retentionDays ?? ""} />
              </label>
            </div>
            <div className="check-grid">
              <label className="check"><input type="checkbox" name="hideExactScores" defaultChecked={config.leaderboard.hideExactScores} />Hide exact scores</label>
              <label className="check"><input type="checkbox" name="enforceSchedule" defaultChecked={config.timing.enforceSchedule} />Enforce the event schedule</label>
              <label className="check"><input type="checkbox" name="timingAllowLateJoin" defaultChecked={config.timing.allowLateJoin} />Timing rules allow late join</label>
            </div>
            <div className="grid">
              <label>
                Early check-in allowance (minutes)
                <input name="allowEarlyCheckInMinutes" type="number" min="0" max="1440" defaultValue={config.timing.allowEarlyCheckInMinutes} />
              </label>
            </div>
          </div>
        </details>

        <details className="advanced-settings-card">
          <summary>
            <span>
              <strong>Branding</strong>
              <small>Optional event color and team-color behavior</small>
            </span>
          </summary>
          <div className="details-body stack">
            <input type="hidden" name="logoAssetId" value={branding.logoAssetId ?? ""} />
            <input type="hidden" name="coverAssetId" value={branding.coverAssetId ?? ""} />
            <input type="hidden" name="background" value={branding.themeTokens?.background ?? ""} />
            <input type="hidden" name="surface" value={branding.themeTokens?.surface ?? ""} />
            <input type="hidden" name="text" value={branding.themeTokens?.text ?? ""} />
            <div className="grid">
              <label>
                Accent color <span className="field-optional">Optional</span>
                <input name="accent" defaultValue={branding.themeTokens?.accent ?? ""} placeholder="e.g. #176b5b" />
                <span className="form-hint">Leave blank to use the default. Hex, RGB, HSL and named colors are supported.</span>
              </label>
              <label>
                Team colors in the participant view
                <select name="teamColorUsage" defaultValue={branding.teamColorUsage ?? "ACCENT"}>
                  <option value="NONE">Do not use team colors</option>
                  <option value="ACCENT">Use as accents</option>
                  <option value="PROMINENT">Use prominently</option>
                </select>
              </label>
            </div>
          </div>
        </details>
      </div>

      <div className={`setup-savebar ${saveState.status === "error" ? "setup-savebar-error" : ""}`}>
        <div>
          <strong>Event settings</strong>
          <span aria-live="polite">{stateText}</span>
        </div>
        <div className="row">
          <span className={`save-state ${saveState.status === "error" ? "save-state-error" : dirty ? "save-state-dirty" : "save-state-saved"}`}>
            {pending ? "Saving…" : saveState.status === "error" ? "Save failed" : dirty ? "Unsaved" : "Saved"}
          </span>
          <button disabled={pending || !dirty}>{pending ? "Saving…" : "Save changes"}</button>
        </div>
      </div>
    </form>
  );
}
