/**
 * The browser's side of server sales (esp-server-sales D3, D5, D7): one sync queue for the
 * app, the calls that read sales back, and the one-time upload of what was already on the
 * phone. Client-only; every function is a no-op (or null) on the server.
 */
import { getLocalPhoto } from "./photos";
import type { HistoryEntry } from "./sale-summary";
import type { Session } from "./session";
import { listHistory, readSaved } from "./storage";
import { API, createSync, type Sync } from "./sync";

/** Set once this version has queued the sales that were on the phone before it (D7). */
export const FIRST_UPLOAD_KEY = "esp:server-sync:v1";

export interface ServerSale extends HistoryEntry {
  version: number;
}

let sync: Sync | null = null;

function local(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function cloud(): Sync | null {
  if (typeof window === "undefined") return null;
  sync ??= createSync({
    fetch: window.fetch.bind(window),
    now: () => Date.now(),
    setTimeout: (fn, ms) => window.setTimeout(fn, ms),
    clearTimeout: (h) => window.clearTimeout(h as number),
    storage: local(),
    readSale: readSaved,
    readPhoto: getLocalPhoto,
  });
  return sync;
}

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}/${path}`, { credentials: "same-origin", signal: AbortSignal.timeout(8_000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** This phone's sales on the server, or null when the server can't be reached. */
export async function fetchServerSales(): Promise<ServerSale[] | null> {
  return (await getJson<{ sales: ServerSale[] }>("sales"))?.sales ?? null;
}

export async function fetchServerSale(id: string): Promise<{ session: Session; version: number } | null> {
  return getJson<{ session: Session; version: number }>(`sales/one?${new URLSearchParams({ id })}`);
}

/**
 * The first time this version opens, queue every sale already saved on the phone and its
 * originals (D7). The flag is set once they're queued; the queue owns delivery from there.
 */
export async function queueFirstUpload(photoKeysFor: (session: Session) => string[]): Promise<number> {
  const q = cloud();
  const store = local();
  if (!q || !store) return 0;
  try {
    if (store.getItem(FIRST_UPLOAD_KEY)) return 0;
  } catch {
    return 0;
  }
  let queued = 0;
  for (const entry of listHistory()) {
    const session = readSaved(entry.id);
    if (!session) continue;
    q.markDirty(session.id);
    q.queuePhotos(session.id, photoKeysFor(session));
    queued += 1;
  }
  try {
    store.setItem(FIRST_UPLOAD_KEY, new Date().toISOString());
  } catch {
    // Private mode: it will queue again next visit, and the server keeps the newest.
  }
  return queued;
}
