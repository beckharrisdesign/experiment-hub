/**
 * The background queue that keeps the server's copy current (esp-server-sales design D3, D6,
 * D8). The screens never wait on it: a change is saved on the phone first, then marked here,
 * and this sends it when it can.
 *
 * - **Sales** go up whole, 1.5 s after the last change, with a version that only ever rises
 *   on this phone. The server keeps the newest.
 * - **Photos** go up after their sale's first successful save (the server checks ownership
 *   through the sale).
 * - **Deletes** go first, and cancel anything still queued for that sale.
 * - **Failures** back off (2 s, 5 s, 15 s, 60 s, then 5 min) and also retry when the phone comes
 *   back online or back to the foreground. Nothing here throws to a caller.
 *
 * What's still to send lives in localStorage, so a reload doesn't drop it. If Safari clears
 * the site while changes are unsent, those changes are lost; everything sent before is safe.
 *
 * Every dependency is injected so the queue runs in tests with fake timers and a fake fetch.
 */
import type { Session } from "./session";

export const SYNC_KEY = "esp:sync:v1";
export const API = "/estate-sale-planner/api";
export const DEBOUNCE_MS = 1500;
export const BACKOFF_MS = [2_000, 5_000, 15_000, 60_000, 300_000];
export const TIMEOUT_MS = 8_000;
/** Over this the sale goes up without thumbnails; restore cuts them again (D3, D5). */
export const SLIM_OVER_BYTES = 3.5 * 1024 * 1024;

export interface SyncState {
  /** Sales waiting to go up, with the version to send. */
  sales: Record<string, number>;
  /** Photos waiting to go up. */
  photos: Array<{ saleId: string; key: string }>;
  deletes: string[];
  /** The newest version this phone has sent or received, per sale. */
  known: Record<string, number>;
  /** The last version handed out, so the next is always higher. */
  clock: number;
}

export interface SyncDeps {
  fetch: typeof fetch;
  now: () => number;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
  /** Where the queue keeps itself; null in private mode, which keeps it in memory only. */
  storage: Pick<Storage, "getItem" | "setItem"> | null;
  /** The phone's current copy of a sale (`storage.readSaved`). */
  readSale: (id: string) => Session | null;
  /** One original from the phone's photo store (`photos.getPhoto`). */
  readPhoto: (key: string) => Promise<Blob | null>;
  log?: (message: string) => void;
}

const empty = (): SyncState => ({ sales: {}, photos: [], deletes: [], known: {}, clock: 0 });

function load(storage: SyncDeps["storage"]): SyncState {
  try {
    const raw = storage?.getItem(SYNC_KEY);
    return raw ? { ...empty(), ...(JSON.parse(raw) as Partial<SyncState>) } : empty();
  } catch {
    return empty();
  }
}

/**
 * The sale as it goes up. Whole when it fits; else without card thumbnails (`image`), which
 * restore cuts again from the originals. Detail-shot thumbnails (`details`) can't be rebuilt, so
 * they go too only when the sale still doesn't fit without the cards; the phone keeps its own
 * copy either way.
 */
export function payloadOf(id: string, version: number, session: Session): string {
  const whole = JSON.stringify({ id, version, session });
  if (whole.length <= SLIM_OVER_BYTES) return whole;
  const noCards = { ...session, items: session.items.map(({ image: _i, ...rest }) => rest) };
  const slimmer = JSON.stringify({ id, version, session: noCards });
  if (slimmer.length <= SLIM_OVER_BYTES) return slimmer;
  const bare = { ...noCards, items: noCards.items.map(({ details: _d, ...rest }) => rest) };
  return JSON.stringify({ id, version, session: bare });
}

export function createSync(deps: SyncDeps) {
  let state = load(deps.storage);
  let timer: unknown = null;
  let dueAt = Infinity;
  let failures = 0;
  let running = false;
  const log = deps.log ?? ((m: string) => console.warn(`[esp sync] ${m}`));

  const persist = () => {
    try {
      deps.storage?.setItem(SYNC_KEY, JSON.stringify(state));
    } catch {
      // Storage full or blocked: the queue still runs from memory this visit.
    }
  };

  function schedule(ms: number) {
    const at = deps.now() + ms;
    if (timer !== null && at >= dueAt) return;
    if (timer !== null) deps.clearTimeout(timer);
    dueAt = at;
    timer = deps.setTimeout(() => {
      timer = null;
      dueAt = Infinity;
      void flush();
    }, ms);
  }

  const call = (path: string, init: RequestInit) =>
    deps.fetch(`${API}/${path}`, { credentials: "same-origin", signal: AbortSignal.timeout(TIMEOUT_MS), ...init });

  function nextVersion(): number {
    state.clock = Math.max(deps.now(), state.clock + 1);
    return state.clock;
  }

  /** A sale changed on the phone. */
  function markDirty(saleId: string) {
    state.sales[saleId] = nextVersion();
    state.deletes = state.deletes.filter((d) => d !== saleId);
    persist();
    schedule(DEBOUNCE_MS);
  }

  /** Photos were kept on the phone for this sale. */
  function queuePhotos(saleId: string, keys: string[]) {
    for (const key of keys) if (!state.photos.some((p) => p.key === key)) state.photos.push({ saleId, key });
    persist();
    schedule(DEBOUNCE_MS);
  }

  /** The family deleted a sale on the phone. */
  function queueDelete(saleId: string) {
    delete state.sales[saleId];
    delete state.known[saleId];
    state.photos = state.photos.filter((p) => p.saleId !== saleId);
    if (!state.deletes.includes(saleId)) state.deletes.push(saleId);
    persist();
    schedule(0);
  }

  /** A copy came down from the server: remember its version so it isn't sent straight back. */
  function noteServerVersion(saleId: string, version: number) {
    state.known[saleId] = Math.max(state.known[saleId] ?? 0, version);
    state.clock = Math.max(state.clock, version);
    persist();
  }

  async function sendDeletes(): Promise<boolean> {
    for (const id of [...state.deletes]) {
      const res = await call("sales/delete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
      // 404: never saved, or already gone. Either way it's done.
      if (!res.ok && res.status !== 404) return false;
      state.deletes = state.deletes.filter((d) => d !== id);
      persist();
    }
    return true;
  }

  async function sendSales(): Promise<boolean> {
    for (const [id, version] of Object.entries(state.sales)) {
      const session = deps.readSale(id);
      if (!session) {
        delete state.sales[id];
        persist();
        continue;
      }
      const res = await call("sales", { method: "POST", headers: { "content-type": "application/json" }, body: payloadOf(id, version, session) });
      if (res.status === 404) {
        log(`sale ${id} belongs to another device; not sending it again`);
      } else if (!res.ok) {
        return false;
      } else {
        state.known[id] = Math.max(state.known[id] ?? 0, version);
      }
      // A change made while this was in flight bumped the version: keep that one queued.
      if (state.sales[id] === version) delete state.sales[id];
      persist();
    }
    return true;
  }

  async function sendPhotos(): Promise<boolean> {
    for (const photo of [...state.photos]) {
      // Wait for the sale's first save: the server checks ownership through it.
      if (!state.known[photo.saleId]) continue;
      const blob = await deps.readPhoto(photo.key);
      if (blob) {
        const form = new FormData();
        form.set("saleId", photo.saleId);
        form.set("key", photo.key);
        form.set("photo", blob, "photo");
        const res = await call("photos", { method: "POST", body: form });
        if (!res.ok && res.status !== 404) return false;
        if (res.status === 404) log(`photo ${photo.key} refused; its sale isn't this device's`);
      }
      state.photos = state.photos.filter((p) => p.key !== photo.key);
      persist();
    }
    return true;
  }

  /** Send everything that's waiting. Never throws; reschedules itself on failure. */
  async function flush(): Promise<void> {
    if (running) return;
    running = true;
    try {
      const ok = (await sendDeletes()) && (await sendSales()) && (await sendPhotos());
      if (!ok) throw new Error("server said no");
      failures = 0;
      // Anything queued while this flush ran (a re-marked sale, a delete, a photo whose sale has now
      // saved) is sent next. Photos still waiting on their sale's first save don't keep it spinning.
      if (state.deletes.length || Object.keys(state.sales).length || state.photos.some((p) => state.known[p.saleId])) schedule(DEBOUNCE_MS);
    } catch (error: unknown) {
      const wait = BACKOFF_MS[Math.min(failures, BACKOFF_MS.length - 1)];
      failures += 1;
      log(`will retry in ${Math.round(wait / 1000)} s (${error instanceof Error ? error.message : String(error)})`);
      schedule(wait);
    } finally {
      running = false;
    }
  }

  /** Retry when the phone is back online or back in the foreground. Returns a stop function. */
  function start(target: Pick<Window, "addEventListener" | "removeEventListener"> & { document?: Document }): () => void {
    const kick = () => {
      if (hasWork()) void flush();
    };
    const onVisible = () => {
      if (target.document?.visibilityState === "visible") kick();
    };
    target.addEventListener("online", kick);
    target.document?.addEventListener("visibilitychange", onVisible);
    kick();
    return () => {
      target.removeEventListener("online", kick);
      target.document?.removeEventListener("visibilitychange", onVisible);
    };
  }

  const hasWork = () => Object.keys(state.sales).length > 0 || state.photos.length > 0 || state.deletes.length > 0;

  return {
    markDirty,
    queuePhotos,
    queueDelete,
    noteServerVersion,
    flush,
    start,
    hasWork,
    knownVersion: (saleId: string) => state.known[saleId],
    /** For tests and the first-open check. */
    snapshot: (): SyncState => JSON.parse(JSON.stringify(state)) as SyncState,
  };
}

export type Sync = ReturnType<typeof createSync>;
