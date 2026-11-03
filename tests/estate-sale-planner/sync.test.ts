// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSync, payloadOf, SLIM_OVER_BYTES, SYNC_KEY, type SyncDeps } from "@/lib/estate-sale-planner/sync";
import type { Session } from "@/lib/estate-sale-planner/session";

const sale = (id: string, name = "Mom's house"): Session => ({
  id,
  createdAt: "2026-11-03T10:00:00Z",
  name,
  items: [{ id: `${id}_0`, name: "Lodge skillet", room: "Kitchen", flagged: true, band: "$50–$100", reason: "r", confidence: "medium", frame: 0, box: null, destination: "sell", image: "data:image/jpeg;base64,AAAA" }],
  history: [],
});

/** A fake server: records calls, answers from a script, and can go offline. */
function harness(over: Partial<SyncDeps> = {}) {
  const calls: Array<{ path: string; body: unknown }> = [];
  const server = { offline: false, status: (_path: string): number => 200 };
  const store = new Map<string, string>();
  const sales = new Map<string, Session>([["esp_a", sale("esp_a")]]);
  const deps: SyncDeps = {
    fetch: vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const path = String(url).replace("/estate-sale-planner/api/", "");
      if (server.offline) throw new TypeError("Failed to fetch");
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : init?.body instanceof FormData ? Object.fromEntries([...init.body.entries()].map(([k, v]) => [k, typeof v === "string" ? v : "<blob>"])) : null;
      calls.push({ path, body });
      const status = server.status(path);
      return new Response(JSON.stringify(status === 200 ? { success: true, saved: true } : { error: "x" }), { status });
    }) as unknown as typeof fetch,
    now: () => Date.now(),
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
    storage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => void store.set(k, v) },
    readSale: (id) => sales.get(id) ?? null,
    readPhoto: async (key) => (key.includes("gone") ? null : new Blob([new Uint8Array(10)], { type: "image/jpeg" })),
    log: () => {},
    ...over,
  };
  return { deps, calls, server, store, sales, sync: createSync(deps) };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-03T12:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("saving a sale in the background", () => {
  it("an edit reaches the server 1.5 s after the first unsent change, with later edits riding along", async () => {
    const h = harness();
    h.sync.markDirty("esp_a");
    await vi.advanceTimersByTimeAsync(500);
    h.sync.markDirty("esp_a"); // doesn't push the send back: steady typing can't hold a save past 5 s
    await vi.advanceTimersByTimeAsync(900);
    expect(h.calls).toEqual([]);
    await vi.advanceTimersByTimeAsync(200);
    expect(h.calls).toHaveLength(1);
    expect(h.calls[0]).toMatchObject({ path: "sales", body: { id: "esp_a", session: { name: "Mom's house" } } });
    expect(h.sync.hasWork()).toBe(false);
  });

  it("every version is higher than the last, even within one millisecond", async () => {
    const h = harness();
    h.sync.markDirty("esp_a");
    const first = h.sync.snapshot().sales.esp_a;
    h.sync.markDirty("esp_a");
    expect(h.sync.snapshot().sales.esp_a).toBeGreaterThan(first);
  });

  it("a dropped signal delays the save and loses nothing", async () => {
    const h = harness();
    h.server.offline = true;
    h.sync.markDirty("esp_a");
    await vi.advanceTimersByTimeAsync(1500 + 2000 + 5000);
    expect(h.calls).toEqual([]);
    expect(h.sync.hasWork()).toBe(true);
    h.server.offline = false;
    await vi.advanceTimersByTimeAsync(15_000);
    expect(h.calls).toHaveLength(1);
    expect(h.sync.hasWork()).toBe(false);
  });

  it("survives a reload: what's unsent is still queued on the phone", async () => {
    const h = harness();
    h.server.offline = true;
    h.sync.markDirty("esp_a");
    const reloaded = createSync({ ...h.deps });
    expect(JSON.parse(h.store.get(SYNC_KEY)!).sales.esp_a).toBeDefined();
    expect(reloaded.hasWork()).toBe(true);
  });

  it("an edit made while a save is in flight is sent next, not dropped", async () => {
    const h = harness();
    let release!: () => void;
    const slow = new Promise<void>((r) => (release = r));
    const fetch = h.deps.fetch;
    h.deps.fetch = (async (...a: Parameters<typeof fetch>) => (await slow, fetch(...a))) as typeof fetch;
    const sync = createSync(h.deps);
    sync.markDirty("esp_a");
    await vi.advanceTimersByTimeAsync(1500);
    sync.markDirty("esp_a"); // while the first is waiting on the network
    release();
    await vi.advanceTimersByTimeAsync(3000);
    expect(h.calls).toHaveLength(2);
    expect((h.calls[1].body as { version: number }).version).toBeGreaterThan((h.calls[0].body as { version: number }).version);
  });

  it("another device's sale (404) is dropped, not retried forever", async () => {
    const h = harness();
    h.server.status = () => 404;
    h.sync.markDirty("esp_a");
    await vi.advanceTimersByTimeAsync(60_000);
    expect(h.calls).toHaveLength(1);
    expect(h.sync.hasWork()).toBe(false);
  });

  it("goes up without thumbnails only when it's too big for one request", () => {
    expect(JSON.parse(payloadOf("esp_a", 1, sale("esp_a"))).session.items[0].image).toBeDefined();
    const huge = sale("esp_a");
    huge.items[0].image = `data:image/jpeg;base64,${"A".repeat(SLIM_OVER_BYTES)}`;
    const sent = JSON.parse(payloadOf("esp_a", 1, huge));
    expect(sent.session.items[0].image).toBeUndefined();
    expect(sent.session.items[0].name).toBe("Lodge skillet");
  });
});

describe("photos", () => {
  it("wait for their sale's first save, then go up, and a retry never duplicates the queue", async () => {
    const h = harness();
    h.sync.queuePhotos("esp_a", ["esp_a/0/0", "esp_a/0/1"]);
    h.sync.queuePhotos("esp_a", ["esp_a/0/0"]);
    await vi.advanceTimersByTimeAsync(1500);
    expect(h.calls).toEqual([]); // sale not saved yet
    h.sync.markDirty("esp_a");
    await vi.advanceTimersByTimeAsync(1500);
    expect(h.calls.map((c) => c.path)).toEqual(["sales", "photos", "photos"]);
    expect(h.calls[1].body).toEqual({ saleId: "esp_a", key: "esp_a/0/0", photo: "<blob>" });
  });

  it("a failed upload is retried later on its own", async () => {
    const h = harness();
    h.sync.markDirty("esp_a");
    await vi.advanceTimersByTimeAsync(1500);
    let fails = 1;
    h.server.status = (p) => (p === "photos" && fails-- > 0 ? 502 : 200);
    h.sync.queuePhotos("esp_a", ["esp_a/0/0"]);
    await vi.advanceTimersByTimeAsync(1500);
    expect(h.sync.hasWork()).toBe(true);
    await vi.advanceTimersByTimeAsync(2000);
    expect(h.calls.filter((c) => c.path === "photos")).toHaveLength(2);
    expect(h.sync.hasWork()).toBe(false);
  });

  it("a photo the phone no longer has is dropped quietly", async () => {
    const h = harness();
    h.sync.markDirty("esp_a");
    h.sync.queuePhotos("esp_a", ["esp_a/gone/0"]);
    await vi.advanceTimersByTimeAsync(5000);
    expect(h.calls.map((c) => c.path)).toEqual(["sales"]);
    expect(h.sync.hasWork()).toBe(false);
  });
});

describe("deletes", () => {
  it("go first and cancel anything still queued for that sale", async () => {
    const h = harness();
    h.sync.markDirty("esp_a");
    h.sync.queuePhotos("esp_a", ["esp_a/0/0"]);
    h.sync.queueDelete("esp_a");
    await vi.advanceTimersByTimeAsync(2000);
    expect(h.calls).toEqual([{ path: "sales/delete", body: { id: "esp_a" } }]);
    expect(h.sync.hasWork()).toBe(false);
  });
});

describe("coming back", () => {
  it("retries as soon as the phone is back online", async () => {
    const h = harness();
    h.server.offline = true;
    h.sync.markDirty("esp_a");
    await vi.advanceTimersByTimeAsync(1600);
    h.server.offline = false;
    const target = new EventTarget() as unknown as Window;
    h.sync.start(target);
    target.dispatchEvent(new Event("online"));
    await vi.advanceTimersByTimeAsync(0);
    expect(h.calls).toHaveLength(1);
  });

  it("a copy from the server isn't sent straight back", () => {
    const h = harness();
    h.sync.noteServerVersion("esp_a", Date.now() + 60_000);
    expect(h.sync.knownVersion("esp_a")).toBe(Date.now() + 60_000);
    h.sync.markDirty("esp_a");
    expect(h.sync.snapshot().sales.esp_a).toBeGreaterThan(Date.now() + 60_000);
  });
});

describe("review fixes (PR #576)", () => {
  it("a delete queued while a flush is in flight is still sent", async () => {
    const h = harness();
    let release!: () => void;
    const slow = new Promise<void>((r) => (release = r));
    const fetch = h.deps.fetch;
    h.deps.fetch = (async (...a: Parameters<typeof fetch>) => (await slow, fetch(...a))) as typeof fetch;
    const sync = createSync(h.deps);
    sync.markDirty("esp_a");
    await vi.advanceTimersByTimeAsync(1500); // flush starts and waits on the network
    h.sales.set("esp_b", sale("esp_b"));
    sync.queueDelete("esp_b");
    release();
    await vi.advanceTimersByTimeAsync(3000);
    expect(h.calls.map((c) => c.path)).toEqual(["sales", "sales/delete"]);
    expect(sync.hasWork()).toBe(false);
  });

  it("keeps detail shots when dropping the card thumbnails is enough", () => {
    const big = sale("esp_a");
    big.items[0].image = `data:image/jpeg;base64,${"A".repeat(SLIM_OVER_BYTES)}`;
    big.items[0].details = ["data:image/jpeg;base64,DETAIL"];
    const sent = JSON.parse(payloadOf("esp_a", 1, big));
    expect(sent.session.items[0].image).toBeUndefined();
    expect(sent.session.items[0].details).toEqual(["data:image/jpeg;base64,DETAIL"]);
  });

  it("drops detail shots only when the sale still doesn't fit without the cards", () => {
    const huge = sale("esp_a");
    huge.items[0].details = [`data:image/jpeg;base64,${"D".repeat(SLIM_OVER_BYTES)}`];
    const sent = JSON.parse(payloadOf("esp_a", 1, huge));
    expect(sent.session.items[0].details).toBeUndefined();
    expect(sent.session.items[0].name).toBe("Lodge skillet");
  });
});
