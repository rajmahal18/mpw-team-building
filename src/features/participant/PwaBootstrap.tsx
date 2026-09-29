"use client";

import { useEffect } from "react";
import { flushOutbox } from "./outbox";

export function PwaBootstrap() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const flush = () => { if (navigator.onLine) void flushOutbox().catch(() => undefined); };
    flush();
    window.addEventListener("online", flush);
    window.addEventListener("focus", flush);
    document.addEventListener("visibilitychange", flush);
    return () => { window.removeEventListener("online", flush); window.removeEventListener("focus", flush); document.removeEventListener("visibilitychange", flush); };
  }, []);
  return null;
}
