"use client";
import { useEffect, useState } from "react";
import { loadLatestSnapshots, type CachedActivitySnapshot, type CachedEventSnapshot } from "./offline-cache";
import { ParticipantActivity } from "./ParticipantActivity";

export function OfflineRecovery() {
  const [activity, setActivity] = useState<CachedActivitySnapshot | null>(null);
  const [event, setEvent] = useState<CachedEventSnapshot | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { void loadLatestSnapshots().then((value) => { setActivity(value.activity); setEvent(value.event); setLoaded(true); }).catch(() => setLoaded(true)); }, []);
  if (!loaded) return <section className="card"><p className="muted">Checking this device for your latest field data…</p></section>;
  if (activity) return <><section className="card offline-recovery-note"><strong>Offline recovery</strong><span>Showing the last activity cached on this device at {new Date(activity.savedAt).toLocaleTimeString()}.</span></section><ParticipantActivity {...activity} offlineRecovery/></>;
  if (event) return <main className="participant-field"><section className="card"><span className="badge">Offline recovery</span><h1>{event.eventName}</h1>{event.teamName && <strong>{event.teamName}</strong>}{event.currentMessage && <p>{event.currentMessage}</p>}<div className="participant-route">{event.route.map((step) => <div className="participant-route-step" key={`${step.sequence}:${step.label}`}><span>{step.sequence}</span><div><strong>{step.label}</strong><small>{step.state}</small></div></div>)}</div><p className="muted">This is the last route status saved on this device. It may be stale until you reconnect.</p></section></main>;
  return <main className="participant-field"><section className="card"><span className="badge">Offline</span><h1>No cached event yet</h1><p>Open your event once while online so this device can retain the current field view for weak-signal recovery.</p></section></main>;
}
