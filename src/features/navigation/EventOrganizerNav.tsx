"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  ["Overview", ""],
  ["Event settings", "/setup"],
  ["People", "/people"],
  ["Library", "/library"],
  ["Activities", "/activities"],
  ["Stations", "/stations"],
  ["Routes", "/routes"],
  ["Live", "/control"],
  ["Scores", "/scores"],
  ["Competitions", "/competitions"],
  ["Media", "/media"],
  ["Audit", "/audit"],
  ["Reports", "/reports"],
] as const;

export function EventOrganizerNav({ base }: { base: string }) {
  const pathname = usePathname();
  return <nav className="event-tabs" aria-label="Event organizer sections">
    {items.map(([label, suffix]) => {
      const href = `${base}${suffix}`;
      const active = suffix === "" ? pathname === base : pathname === href || pathname.startsWith(`${href}/`);
      return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={active ? "active" : undefined}>{label}</Link>;
    })}
    <Link href={`${base}/lab`} className={pathname.startsWith(`${base}/lab`) ? "active developer-tab" : "developer-tab"}>Engine lab</Link>
  </nav>;
}
