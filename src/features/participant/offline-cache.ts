"use client";

export type CachedActivitySnapshot = {
  kind: "activity";
  savedAt: number;
  eventId: string;
  eventSlug: string;
  activityRunId: string;
  activityTitle: string;
  projection: unknown;
  completedBlockIds: string[];
  existingMedia: Array<{ id: string; blockId: string | null; kind: string; moderationStatus: string }>;
  runState: string;
};

export type CachedEventSnapshot = {
  kind: "event";
  savedAt: number;
  eventId: string;
  eventSlug: string;
  eventName: string;
  teamName?: string;
  currentMessage?: string;
  route: Array<{ sequence: number; label: string; state: string }>;
};

const DB_NAME = "mpw-team-building-offline-cache";
const DB_VERSION = 1;
const STORE = "snapshots";

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "key" }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open offline cache"));
  });
}

async function save(key: string, value: CachedActivitySnapshot | CachedEventSnapshot) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ key, ...value });
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error ?? new Error("Unable to cache field data"));
  });
  db.close();
}

export async function saveActivitySnapshot(snapshot: Omit<CachedActivitySnapshot, "kind" | "savedAt">) {
  return save(`activity:${snapshot.eventId}`, { ...snapshot, kind: "activity", savedAt: Date.now() });
}

export async function saveEventSnapshot(snapshot: Omit<CachedEventSnapshot, "kind" | "savedAt">) {
  return save(`event:${snapshot.eventId}`, { ...snapshot, kind: "event", savedAt: Date.now() });
}

export async function loadLatestSnapshots() {
  const db = await openDb();
  const values = await new Promise<Array<(CachedActivitySnapshot | CachedEventSnapshot) & { key: string }>>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly"); const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error ?? new Error("Unable to read offline cache"));
  });
  db.close();
  const sorted = values.sort((a, b) => b.savedAt - a.savedAt);
  return { activity: sorted.find((item): item is CachedActivitySnapshot & { key: string } => item.kind === "activity") ?? null, event: sorted.find((item): item is CachedEventSnapshot & { key: string } => item.kind === "event") ?? null };
}
