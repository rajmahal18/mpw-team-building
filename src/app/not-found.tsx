import Link from "next/link";

export default function NotFound() {
  return <main className="system-state"><section className="system-state-card"><span className="eyebrow">404</span><h1>That page isn’t available.</h1><p className="muted">The event, workspace, or link may no longer be active.</p><Link className="button" href="/">Return home</Link></section></main>;
}
