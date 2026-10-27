/**
 * The original photos, kept on the device (sold-comps design D1).
 *
 * Founder, 2026-10-27: "what if the user needs to split out the image or adjust
 * what we've determined is the subject of the image?" — which needs something
 * to re-crop from. The walkthrough still sends the model a 768 px frame; the
 * 1600 px copy is kept here, in IndexedDB, until accounts and cloud storage
 * (round 05b).
 *
 * The store stays under `PHOTO_STORE.capBytes`: before a write that would pass
 * it (or hits the browser's quota), the oldest sale's originals are deleted,
 * one sale at a time, never the sale being written. Thumbnails, names, bands,
 * destinations and corrections live in the session, so they survive eviction;
 * only re-cropping is lost. Photos are stored as bytes + type rather than Blob
 * so every IndexedDB implementation can clone them.
 */
import { PHOTO_STORE } from "./config";

interface StoredPhoto {
  id: string;
  saleId: string;
  type: string;
  data: ArrayBuffer;
  bytes: number;
  savedAt: number;
}

export interface SaleUsage {
  saleId: string;
  bytes: number;
  /** When the sale's first kept photo was saved — the eviction order. */
  oldest: number;
}

export const photoKey = (saleId: string, pass: number, frame: number) => `${saleId}/${pass}/${frame}`;

/** Which sales' originals to drop, oldest first, so `incoming` bytes fit under `cap`. Pure. */
export function planEviction(sales: SaleUsage[], incoming: number, cap: number, writing: string): string[] {
  let total = sales.reduce((n, s) => n + s.bytes, 0);
  const out: string[] = [];
  for (const s of [...sales].filter((x) => x.saleId !== writing).sort((a, b) => a.oldest - b.oldest)) {
    if (total + incoming <= cap) break;
    out.push(s.saleId);
    total -= s.bytes;
  }
  return out;
}

const STORE = "originals";

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const req = indexedDB.open(PHOTO_STORE.dbName, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" }).createIndex("saleId", "saleId");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function all<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Bytes kept per sale. */
export async function photoUsage(): Promise<{ bytes: number; sales: SaleUsage[] }> {
  const db = await openDb();
  if (!db) return { bytes: 0, sales: [] };
  const rows = (await all(db.transaction(STORE).objectStore(STORE).getAll())) as StoredPhoto[];
  const by = new Map<string, SaleUsage>();
  for (const r of rows) {
    const u = by.get(r.saleId) ?? { saleId: r.saleId, bytes: 0, oldest: r.savedAt };
    u.bytes += r.bytes;
    u.oldest = Math.min(u.oldest, r.savedAt);
    by.set(r.saleId, u);
  }
  const sales = [...by.values()];
  return { bytes: sales.reduce((n, s) => n + s.bytes, 0), sales };
}

export async function deleteSalePhotos(saleId: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const tx = db.transaction(STORE, "readwrite");
  const keys = await all(tx.objectStore(STORE).index("saleId").getAllKeys(saleId));
  for (const k of keys) tx.objectStore(STORE).delete(k);
  await done(tx);
}

let askedToPersist = false;

/**
 * Keep one pass's originals. Returns the sales whose originals were evicted to make room.
 * Never throws: a device that can't store photos still gets its items, just no re-cropping.
 */
export async function putPhotos(
  saleId: string,
  pass: number,
  photos: Array<{ frame: number; blob: Blob }>,
  opts: { now?: number; capBytes?: number } = {},
): Promise<string[]> {
  const db = await openDb();
  if (!db || photos.length === 0) return [];
  if (!askedToPersist && typeof navigator !== "undefined" && navigator.storage?.persist) {
    askedToPersist = true;
    void navigator.storage.persist().catch(() => false);
  }
  const now = opts.now ?? Date.now();
  const cap = opts.capBytes ?? PHOTO_STORE.capBytes;
  const rows: StoredPhoto[] = await Promise.all(
    photos.map(async ({ frame, blob }) => ({ id: photoKey(saleId, pass, frame), saleId, type: blob.type || "image/jpeg", data: await blob.arrayBuffer(), bytes: blob.size, savedAt: now })),
  );
  const incoming = rows.reduce((n, r) => n + r.bytes, 0);
  const evicted = planEviction((await photoUsage()).sales, incoming, cap, saleId);
  for (const id of evicted) await deleteSalePhotos(id);
  try {
    const tx = db.transaction(STORE, "readwrite");
    for (const r of rows) tx.objectStore(STORE).put(r);
    await done(tx);
  } catch (error) {
    // The browser's own quota can bite before ours: drop the next-oldest sale and try once more.
    const next = planEviction((await photoUsage()).sales, Number.MAX_SAFE_INTEGER, 0, saleId)[0];
    if (!next) {
      console.warn("[esp photos] could not keep originals:", error);
      return evicted;
    }
    await deleteSalePhotos(next);
    evicted.push(next);
    try {
      const tx = db.transaction(STORE, "readwrite");
      for (const r of rows) tx.objectStore(STORE).put(r);
      await done(tx);
    } catch (again) {
      console.warn("[esp photos] could not keep originals:", again);
    }
  }
  return evicted;
}

export async function getPhoto(id: string): Promise<Blob | null> {
  const db = await openDb();
  if (!db) return null;
  const row = (await all(db.transaction(STORE).objectStore(STORE).get(id))) as StoredPhoto | undefined;
  return row ? new Blob([row.data], { type: row.type }) : null;
}
