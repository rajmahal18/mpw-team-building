"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function LiveRefresh({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const interval = window.setInterval(() => router.refresh(), Math.max(5, seconds) * 1000);
    return () => window.clearInterval(interval);
  }, [router, seconds]);
  return <span className="badge" title={`Refreshes every ${seconds} seconds`}>Live refresh · {seconds}s</span>;
}
