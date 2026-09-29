"use client";

import { useCallback, useEffect, useState } from "react";
import { flushOutbox, outboxChangeEventName, outboxSummary, retryBlockedOutbox } from "./outbox";

const LOW_BANDWIDTH_KEY = "mpw_tb_low_bandwidth";

export function useLowBandwidthPreference() {
  const [lowBandwidth, setLowBandwidthState] = useState(false);
  useEffect(() => { setLowBandwidthState(localStorage.getItem(LOW_BANDWIDTH_KEY) === "1"); }, []);
  const setLowBandwidth = useCallback((value: boolean) => { setLowBandwidthState(value); localStorage.setItem(LOW_BANDWIDTH_KEY, value ? "1" : "0"); }, []);
  return [lowBandwidth, setLowBandwidth] as const;
}

export function ParticipantStatusBar() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [blocked, setBlocked] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lowBandwidth, setLowBandwidth] = useLowBandwidthPreference();
  const refreshCount = useCallback(async () => { const summary = await outboxSummary().catch(() => ({ pending: 0, blocked: 0 })); setPending(summary.pending); setBlocked(summary.blocked); }, []);
  const sync = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    await flushOutbox().catch(() => undefined);
    await refreshCount();
    setSyncing(false);
  }, [refreshCount]);

  useEffect(() => {
    const updateOnline = () => { setOnline(navigator.onLine); if (navigator.onLine) void sync(); };
    setOnline(navigator.onLine); void refreshCount(); if (navigator.onLine) void sync();
    window.addEventListener("online", updateOnline); window.addEventListener("offline", updateOnline); window.addEventListener(outboxChangeEventName(), refreshCount);
    return () => { window.removeEventListener("online", updateOnline); window.removeEventListener("offline", updateOnline); window.removeEventListener(outboxChangeEventName(), refreshCount); };
  }, [refreshCount, sync]);

  return <div className={`participant-status ${online ? "online" : "offline"}`} role="status" aria-live="polite">
    <span><strong>{online ? "Online" : "Offline"}</strong>{pending > 0 ? ` · ${pending} pending` : " · synced"}{blocked > 0 ? ` · ${blocked} needs attention` : ""}</span>
    <div className="row">
      {pending > 0 && online && <button type="button" className="text-button" disabled={syncing} onClick={() => void sync()}>{syncing ? "Syncing…" : "Sync now"}</button>}
      {blocked > 0 && <button type="button" className="text-button" disabled={syncing} onClick={() => void (async()=>{await retryBlockedOutbox();await sync();})()}>Retry failed</button>}
      <label className="check compact-check"><input type="checkbox" checked={lowBandwidth} onChange={(event) => setLowBandwidth(event.target.checked)}/>Low data</label>
    </div>
  </div>;
}
