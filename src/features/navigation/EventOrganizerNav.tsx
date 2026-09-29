"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const primaryItems = [
  ["Overview", ""],
  ["Setup", "/setup"],
  ["People", "/people"],
  ["Activities", "/activities"],
  ["Stations", "/stations"],
  ["Routes", "/routes"],
  ["Live", "/control"],
  ["Scores", "/scores"],
] as const;

const moreItems = [
  ["Activity library", "/library"],
  ["Competitions", "/competitions"],
  ["Media review", "/media"],
  ["Reports", "/reports"],
  ["Audit log", "/audit"],
] as const;

export function EventOrganizerNav({ base }: { base: string }) {
  const pathname = usePathname();
  const isActive = (suffix: string) => suffix === "" ? pathname === base : pathname === `${base}${suffix}` || pathname.startsWith(`${base}${suffix}/`);
  const moreActive = moreItems.some(([, suffix]) => isActive(suffix)) || isActive("/lab");

  return <nav className="event-tabs" aria-label="Event organizer sections">
    <div className="event-tab-scroll">
      {primaryItems.map(([label, suffix]) => {
        const href = `${base}${suffix}`;
        const active = isActive(suffix);
        return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={active ? "active" : undefined}>{label}</Link>;
      })}
    </div>
    <details className="event-more-menu">
      <summary className={moreActive ? "active" : undefined}>More</summary>
      <div className="event-more-panel">
        {moreItems.map(([label, suffix]) => {
          const href = `${base}${suffix}`;
          const active = isActive(suffix);
          return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={active ? "active" : undefined}>{label}</Link>;
        })}
        <Link href={`${base}/lab`} aria-current={isActive("/lab") ? "page" : undefined} className={isActive("/lab") ? "active developer-tab" : "developer-tab"}>Engine lab</Link>
      </div>
    </details>
  </nav>;
}
