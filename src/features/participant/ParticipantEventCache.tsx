"use client";
import { useEffect } from "react";
import { saveEventSnapshot } from "./offline-cache";

export function ParticipantEventCache(props: { eventId: string; eventSlug: string; eventName: string; teamName?: string; currentMessage?: string; route: Array<{ sequence: number; label: string; state: string }> }) {
  useEffect(() => { void saveEventSnapshot(props).catch(() => undefined); }, [props]);
  return null;
}
