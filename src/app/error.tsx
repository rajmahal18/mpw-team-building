"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("application.render_error", { message: error.message, digest: error.digest }); }, [error]);
  return <main className="system-state"><section className="system-state-card"><span className="eyebrow">Something went wrong</span><h1>This screen couldn’t load.</h1><p className="muted">Your saved event data has not been changed. Retry the screen, or return to the organizer.</p><div className="row"><button onClick={reset}>Try again</button><a className="button secondary" href="/admin">Organizer</a></div>{error.digest && <small className="muted">Reference: {error.digest}</small>}</section></main>;
}
