import Link from "next/link";

export default function HomePage() {
  return <main className="landing-main">
    <section className="landing-hero">
      <div className="eyebrow">MPW · reusable event operations</div>
      <h1>One platform for team-building events that never need to be hardcoded twice.</h1>
      <p>Configure activities, stations, routes, scoring, competitions, participant flows, media, and live operations from reusable primitives.</p>
      <div className="row landing-actions"><Link className="button" href="/admin">Open organizer</Link><span className="quiet-chip">Mobile-first · offline-aware · auditable</span></div>
    </section>
    <section className="landing-grid" aria-label="Platform capabilities">
      <article className="landing-feature"><span>01</span><h2>Build</h2><p>Create event-specific experiences without changing application logic.</p></article>
      <article className="landing-feature"><span>02</span><h2>Operate</h2><p>Run queues, checkpoints, marshals, announcements, scoring and reroutes in real time.</p></article>
      <article className="landing-feature"><span>03</span><h2>Participate</h2><p>Teams use normal phone cameras, lightweight sessions and a resilient mobile event view.</p></article>
      <article className="landing-feature"><span>04</span><h2>Review</h2><p>Export results, inspect audit history, moderate media and retain operational evidence.</p></article>
    </section>
  </main>;
}
