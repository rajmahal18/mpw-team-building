"use client";

type SubmissionMutation = {
  id: string;
  kind: "submission";
  createdAt: number;
  attemptCount: number;
  blockedReason?: string;
  body: { eventId: string; activityRunId: string; blockId: string; payload: unknown; idempotencyKey: string };
};

type QueuedFile = { name: string; type: string; blob: Blob };
type MediaMutation = {
  id: string;
  kind: "media_submission";
  createdAt: number;
  attemptCount: number;
  blockedReason?: string;
  eventId: string;
  activityRunId: string;
  blockId: string;
  idempotencyKey: string;
  files: QueuedFile[];
};

export type OutboxMutation = SubmissionMutation | MediaMutation;
const DB_NAME = "mpw-team-building-pwa";
const STORE = "outbox";
const DB_VERSION = 1;
const CHANGE_EVENT = "mpw-outbox-change";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open participant outbox"));
  });
}

function emitChange() { if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE_EVENT)); }
export function outboxChangeEventName() { return CHANGE_EVENT; }
export function newMutationId(prefix = "mutation") { return `${prefix}:${Date.now()}:${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`; }

async function put(item: OutboxMutation) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Unable to save pending action"));
  });
  db.close(); emitChange();
}

async function remove(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Unable to clear pending action"));
  });
  db.close(); emitChange();
}

export async function listOutbox(): Promise<OutboxMutation[]> {
  const db = await openDb();
  const rows = await new Promise<OutboxMutation[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => resolve((request.result as OutboxMutation[]).sort((a, b) => a.createdAt - b.createdAt));
    request.onerror = () => reject(request.error ?? new Error("Unable to read pending actions"));
  });
  db.close(); return rows;
}

export async function countOutbox() { return (await listOutbox()).length; }
export async function outboxSummary() {
  const rows = await listOutbox();
  return { total: rows.length, blocked: rows.filter((row) => Boolean(row.blockedReason)).length, pending: rows.filter((row) => !row.blockedReason).length };
}
export async function retryBlockedOutbox() {
  const rows = await listOutbox();
  for (const row of rows) if (row.blockedReason) await put({ ...row, blockedReason: undefined, attemptCount: row.attemptCount + 1 });
  emitChange();
}

class PermanentOutboxError extends Error {}
export function isPermanentOutboxStatus(status: number) { return status >= 400 && status < 500 && status !== 408 && status !== 429; }

export async function queueSubmission(body: SubmissionMutation["body"]) {
  const id = body.idempotencyKey;
  await put({ id, kind: "submission", createdAt: Date.now(), attemptCount: 0, body });
  return id;
}

export async function queueMediaSubmission(input: Omit<MediaMutation, "id" | "kind" | "createdAt" | "attemptCount">) {
  const id = input.idempotencyKey;
  await put({ ...input, id, kind: "media_submission", createdAt: Date.now(), attemptCount: 0 });
  return id;
}

async function sendSubmission(body: SubmissionMutation["body"]) {
  const response = await fetch("/api/participant/submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error || `Submission failed (${response.status})`;
    if (isPermanentOutboxStatus(response.status)) throw new PermanentOutboxError(message);
    throw new Error(message);
  }
  return data;
}

async function sendMedia(item: MediaMutation) {
  const assetIds: string[] = [];
  for (const file of item.files) {
    const form = new FormData();
    form.set("eventId", item.eventId);
    form.set("activityRunId", item.activityRunId);
    form.set("blockId", item.blockId);
    form.set("file", new File([file.blob], file.name, { type: file.type || file.blob.type }));
    const response = await fetch("/api/participant/media", { method: "POST", body: form });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data.error || `Media upload failed (${response.status})`;
      if (isPermanentOutboxStatus(response.status)) throw new PermanentOutboxError(message);
      throw new Error(message);
    }
    assetIds.push(data.asset.id);
  }
  return sendSubmission({ eventId: item.eventId, activityRunId: item.activityRunId, blockId: item.blockId, payload: { assetIds }, idempotencyKey: item.idempotencyKey });
}

export async function flushOutbox(options?: { stopOnNetworkError?: boolean; includeBlocked?: boolean }) {
  const rows = await listOutbox();
  const result = { sent: 0, remaining: rows.length, blocked: rows.filter((row) => Boolean(row.blockedReason)).length, lastError: "" };
  for (const row of rows) {
    if (row.blockedReason && !options?.includeBlocked) continue;
    try {
      if (row.kind === "submission") await sendSubmission(row.body);
      else await sendMedia(row);
      await remove(row.id);
      result.sent += 1;
      result.remaining -= 1;
      if (row.blockedReason) result.blocked = Math.max(0, result.blocked - 1);
    } catch (error) {
      result.lastError = error instanceof Error ? error.message : "Unable to sync";
      if (error instanceof PermanentOutboxError) {
        await put({ ...row, blockedReason: result.lastError, attemptCount: row.attemptCount + 1 });
        if (!row.blockedReason) result.blocked += 1;
        continue;
      }
      if (options?.stopOnNetworkError !== false) break;
    }
  }
  emitChange();
  return result;
}
