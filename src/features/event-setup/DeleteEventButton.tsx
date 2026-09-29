"use client";

import { useActionState, useState } from "react";
import { deleteEvent } from "@/app/admin/actions";

export function DeleteEventButton({ eventId, name }: { eventId: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [result, action, pending] = useActionState(deleteEvent.bind(null, eventId), { error: "" });
  return <div className="event-delete">
    {!confirming ? <button type="button" className="secondary danger-text" onClick={() => setConfirming(true)} aria-label={`Delete ${name}`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg> Delete
    </button> : <form action={action}>
      <p>Delete “{name}” from your events? Records and audit history will be retained.</p>
      <div className="row"><button disabled={pending} className="secondary danger-text">{pending ? "Deleting…" : "Confirm delete"}</button><button type="button" className="secondary" disabled={pending} onClick={() => setConfirming(false)}>Cancel</button></div>
      {result.error && <p role="alert" className="danger-text">{result.error}</p>}
    </form>}
  </div>;
}
