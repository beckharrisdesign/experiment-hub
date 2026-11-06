// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { DEVICE_COOKIE, hashDevice } from "@/lib/estate-sale-planner/device";
import type { CompsSummary } from "@/lib/estate-sale-planner/comps/summary";

const DEVICE = "a".repeat(43);
const OTHER = "b".repeat(43);
const NOW = new Date("2026-11-06T16:12:00Z");

type Row = Record<string, any>;
interface Fail {
  read?: boolean;
  reserve?: boolean;
  save?: boolean;
  release?: boolean;
  sale?: boolean;
  count?: boolean;
}

/** Just enough of the service-role client for esp_comps_checks and esp_sales ownership. */
function fakeDb(rows: Row[] = [], fail: Fail = {}, sales: Row[] = []) {
  let nextId = 1;
  const checks = () => {
    const filters: Array<[string, unknown]> = [];
    let since: string | null = null;
    let counting = false;
    const matching = () =>
      rows
        .filter((r) => filters.every(([k, v]) => r[k] === v) && (!since || r.checked_at >= since))
        .sort((a, b) => b.checked_at.localeCompare(a.checked_at));
    const q: any = {
      select: (_cols?: string, opts?: { count?: string }) => ((counting = Boolean(opts?.count)), q),
      eq: (k: string, v: unknown) => (filters.push([k, v]), q),
      gte: (_k: string, v: string) => ((since = v), q),
      order: () => q,
      limit: () => q,
      then: (resolve: (v: unknown) => void) => {
        if (counting) return resolve(fail.count ? { count: null, error: new Error("down") } : { count: matching().length, error: null });
        return resolve(fail.read ? { data: null, error: new Error("down") } : { data: matching(), error: null });
      },
      insert: (row: Row) => ({
        select: () => ({
          single: async () => {
            if (fail.reserve) return { data: null, error: new Error("down") };
            const id = `row_${nextId++}`;
            rows.push({ ...row, id });
            return { data: { id }, error: null };
          },
        }),
      }),
      update: (patch: Row) => ({
        eq: async (_k: string, id: string) => {
          if (fail.save) return { error: new Error("down") };
          Object.assign(rows.find((r) => r.id === id)!, patch);
          return { error: null };
        },
      }),
      delete: () => ({
        eq: async (_k: string, id: string) => {
          if (fail.release) return { error: new Error("down") };
          rows.splice(rows.findIndex((r) => r.id === id), 1);
          return { error: null };
        },
      }),
    };
    return q;
  };
  const saleTable = () => {
    let id: unknown;
    const q: any = {
      select: () => q,
      eq: (_k: string, v: unknown) => ((id = v), q),
      maybeSingle: async () => (fail.sale ? { data: null, error: new Error("down") } : { data: sales.find((r) => r.id === id) ?? null, error: null }),
    };
    return q;
  };
  return { rows, from: (table: string) => (table === "esp_sales" ? saleTable() : checks()) };
}

const answer: CompsSummary = {
  status: "ok",
  query: "lodge no 8 skillet",
  found: 5,
  matched: 4,
  band: "$50–$100",
  rangeCents: [5500, 9400],
  reason: "Kept the four.",
  fetchedAt: NOW.toISOString(),
  detail: {
    query: "lodge no 8 skillet",
    queryModel: "gpt-5-nano",
    queryReused: false,
    provider: "compsapi",
    listingsAt: NOW.toISOString(),
    found: 5,
    checked: 5,
    readModel: "gpt-5",
    matched: 4,
    reason: "Kept the four.",
    band: "$50–$100",
    rangeCents: [5500, 9400],
    matches: [{ title: "Lodge 8", priceCents: 9400, soldAt: "2026-10-14T00:00:00Z", url: "https://www.ebay.com/itm/4" }],
    leftOut: [{ title: "A lid", priceCents: 500, soldAt: "2026-10-15T00:00:00Z", url: "https://www.ebay.com/itm/5" }],
  },
};

const item = { name: "Lodge No. 8 skillet", band: "$100–$250", priceBefore: "$100–$250", destination: "sell", markReading: "LODGE 8", note: "From the kitchen" };
const body = { item, saleId: "esp_abc", itemId: "esp_abc_0" };
const URL_BASE = "http://localhost/estate-sale-planner/api/comps";

function post(b: unknown = body, device: string | null = DEVICE) {
  return new NextRequest(URL_BASE, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "1.1.1.1", ...(device ? { cookie: `${DEVICE_COOKIE}=${device}` } : {}) },
    body: JSON.stringify(b),
  });
}
function get(query = "saleId=esp_abc&itemId=esp_abc_0", device: string | null = DEVICE) {
  return new NextRequest(`${URL_BASE}?${query}`, { headers: { "x-forwarded-for": "1.1.1.1", ...(device ? { cookie: `${DEVICE_COOKIE}=${device}` } : {}) } });
}

let db: ReturnType<typeof fakeDb> | null;
let lookup: ReturnType<typeof vi.fn>;
let route: typeof import("@/app/estate-sale-planner/api/comps/route");

beforeEach(async () => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  db = fakeDb();
  lookup = vi.fn(async () => answer);
  vi.resetModules();
  vi.doMock("@/lib/estate-sale-planner/supabase-admin", () => ({ createAdminSupabaseClient: () => db }));
  vi.doMock("@/lib/estate-sale-planner/comps/lookup", () => ({ lookupComps: lookup }));
  route = await import("@/app/estate-sale-planner/api/comps/route");
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.doUnmock("@/lib/estate-sale-planner/supabase-admin");
  vi.doUnmock("@/lib/estate-sale-planner/comps/lookup");
});

describe("POST: the check button", () => {
  it("needs a sale, an item and a device", async () => {
    expect((await route.POST(post({ item, itemId: "esp_abc_0" }))).status).toBe(400);
    expect((await route.POST(post({ item, saleId: "esp_abc" }))).status).toBe(400);
    expect((await route.POST(post({ ...body, itemId: "not ok!" }))).status).toBe(400);
    expect((await route.POST(post(body, null))).status).toBe(400);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("always asks for fresh listings", async () => {
    await route.POST(post());
    expect(lookup.mock.calls[0][0]).toMatchObject({ fresh: true, saleId: "esp_abc" });
  });

  it("saves a completed check with a timestamp, its inputs and its sources", async () => {
    const res = await route.POST(post());
    const json = await res.json();
    expect(json).toMatchObject({ success: true, status: "ok", band: "$50–$100", nextCheckAt: "2026-11-07T16:12:00.000Z" });
    expect(json.detail).toBeUndefined();
    expect(json.check).toMatchObject({
      at: NOW.toISOString(),
      status: "ok",
      given: { name: "Lodge No. 8 skillet", markReading: "LODGE 8", note: "From the kitchen", priceBefore: "$100–$250" },
      query: "lodge no 8 skillet",
      readModel: "gpt-5",
      matches: [{ url: "https://www.ebay.com/itm/4" }],
      leftOut: [{ url: "https://www.ebay.com/itm/5" }],
    });
    expect(db!.rows).toHaveLength(1);
    expect(db!.rows[0]).toMatchObject({ device_hash: await hashDevice(DEVICE), sale_id: "esp_abc", item_id: "esp_abc_0", status: "ok", checked_at: NOW.toISOString() });
    expect(db!.rows[0].detail).toEqual(json.check);
  });

  it("refuses a second check within 24 hours, without running anything", async () => {
    await route.POST(post());
    lookup.mockClear();
    const json = await (await route.POST(post())).json();
    expect(json).toMatchObject({ success: true, status: "limited", nextCheckAt: "2026-11-07T16:12:00.000Z", check: { status: "ok" } });
    expect(lookup).not.toHaveBeenCalled();
    expect(db!.rows).toHaveLength(1);
  });

  it("allows another once 24 hours have passed", async () => {
    await route.POST(post());
    vi.setSystemTime(new Date(NOW.getTime() + 24 * 60 * 60 * 1000));
    lookup.mockClear();
    const json = await (await route.POST(post())).json();
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(json.status).toBe("ok");
    expect(db!.rows).toHaveLength(2);
  });

  it("limits each item separately, and each device separately", async () => {
    await route.POST(post());
    lookup.mockClear();
    await route.POST(post({ ...body, itemId: "esp_abc_1" }));
    await route.POST(post(body, OTHER));
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it("counts a too-few answer: the money was spent", async () => {
    lookup.mockResolvedValueOnce({ ...answer, status: "too-few", band: undefined, rangeCents: undefined, detail: { ...answer.detail!, band: undefined, rangeCents: undefined } });
    expect((await (await route.POST(post())).json()).check.status).toBe("too-few");
    expect((await (await route.POST(post())).json()).status).toBe("limited");
  });

  it("doesn't count a failure or a gated item: nothing to save, and the button still works", async () => {
    for (const status of ["error", "quota", "not-configured", "gated"] as const) {
      lookup.mockResolvedValueOnce({ status });
      const json = await (await route.POST(post())).json();
      expect(json.status).toBe(status);
      expect(json.check).toBeUndefined();
    }
    expect(db!.rows).toHaveLength(0);
    expect(lookup).toHaveBeenCalledTimes(4);
  });

  it("spends nothing when it can't tell whether today's check was used", async () => {
    db = fakeDb([], { read: true });
    const json = await (await route.POST(post())).json();
    expect(json).toMatchObject({ success: true, status: "error" });
    expect(lookup).not.toHaveBeenCalled();
  });

  it("spends nothing when it can't reserve the check first", async () => {
    db = fakeDb([], { reserve: true });
    const json = await (await route.POST(post())).json();
    expect(json).toMatchObject({ success: true, status: "error" });
    expect(lookup).not.toHaveBeenCalled();
  });

  it("holds the reservation while the lookup runs, so a second request is refused", async () => {
    let during: Row[] = [];
    lookup.mockImplementationOnce(async () => {
      during = db!.rows.map((r) => ({ ...r }));
      return answer;
    });
    await route.POST(post());
    expect(during).toEqual([expect.objectContaining({ status: "running", detail: null })]);
  });

  it("keeps the limit when a paid check can't be saved, and says it wasn't saved", async () => {
    db = fakeDb([], { save: true });
    const json = await (await route.POST(post())).json();
    // The answer was paid for, so the item still gets it, marked as not durable.
    expect(json).toMatchObject({ success: true, status: "ok", saved: false, nextCheckAt: "2026-11-07T16:12:00.000Z" });
    expect(db.rows).toEqual([expect.objectContaining({ status: "running", detail: null })]);
    lookup.mockClear();
    const again = await (await route.POST(post())).json();
    expect(again).toMatchObject({ status: "limited", check: null, nextCheckAt: "2026-11-07T16:12:00.000Z" });
    expect(lookup).not.toHaveBeenCalled();
  });

  it("says a saved check was saved", async () => {
    expect((await (await route.POST(post())).json()).saved).toBe(true);
  });

  it("gives the reservation back when the lookup throws", async () => {
    lookup.mockRejectedValueOnce(new Error("boom"));
    expect((await route.POST(post())).status).toBe(502);
    expect(db!.rows).toHaveLength(0);
  });

  it("refuses a sale that belongs to another device, without spending", async () => {
    db = fakeDb([], {}, [{ id: "esp_abc", device_hash: await hashDevice(OTHER) }]);
    expect((await route.POST(post())).status).toBe(404);
    expect(lookup).not.toHaveBeenCalled();
    expect(db.rows).toHaveLength(0);
  });

  it("allows this device's own sale, and one not saved to the server yet", async () => {
    db = fakeDb([], {}, [{ id: "esp_abc", device_hash: await hashDevice(DEVICE) }]);
    expect((await (await route.POST(post())).json()).status).toBe("ok");
    db = fakeDb();
    expect((await (await route.POST(post({ ...body, saleId: "esp_new" }))).json()).status).toBe("ok");
  });

  it("spends nothing when it can't tell who owns the sale", async () => {
    db = fakeDb([], { sale: true });
    expect((await (await route.POST(post())).json()).status).toBe("error");
    expect(lookup).not.toHaveBeenCalled();
  });

  it("caps one device's checks across all items, so made-up item ids can't run up the bill", async () => {
    const hash = await hashDevice(DEVICE);
    const recent = Array.from({ length: 100 }, (_, i) => ({ id: `old_${i}`, device_hash: hash, sale_id: "esp_abc", item_id: `esp_abc_${i}`, status: "ok", checked_at: new Date(NOW.getTime() - 60_000).toISOString(), detail: {} }));
    db = fakeDb(recent);
    const json = await (await route.POST(post({ ...body, itemId: "esp_abc_new" }))).json();
    expect(json.status).toBe("quota");
    expect(lookup).not.toHaveBeenCalled();
    // Yesterday's don't count, and another device has its own.
    expect((await (await route.POST(post({ ...body, itemId: "esp_abc_new" }, OTHER))).json()).status).toBe("ok");
    db = fakeDb(recent.map((r) => ({ ...r, checked_at: new Date(NOW.getTime() - 25 * 60 * 60 * 1000).toISOString() })));
    expect((await (await route.POST(post({ ...body, itemId: "esp_abc_new" }))).json()).status).toBe("ok");
  });

  it("spends nothing when it can't count the device's checks", async () => {
    db = fakeDb([], { count: true });
    expect((await (await route.POST(post())).json()).status).toBe("error");
    expect(lookup).not.toHaveBeenCalled();
  });

  it("still answers with no database (local), with nothing to limit against", async () => {
    db = null;
    const json = await (await route.POST(post())).json();
    expect(json.status).toBe("ok");
    expect(json.check).toMatchObject({ status: "ok" });
  });
});

describe("GET: the saved check", () => {
  it("is empty before any check", async () => {
    expect(await (await route.GET(get())).json()).toEqual({ success: true, check: null, nextCheckAt: null });
  });

  it("returns the saved check without running a lookup", async () => {
    await route.POST(post());
    lookup.mockClear();
    const json = await (await route.GET(get())).json();
    expect(json).toMatchObject({ success: true, nextCheckAt: "2026-11-07T16:12:00.000Z", check: { at: NOW.toISOString(), reason: "Kept the four." } });
    expect(lookup).not.toHaveBeenCalled();
  });

  it("returns the newest of several", async () => {
    await route.POST(post());
    vi.setSystemTime(new Date(NOW.getTime() + 25 * 60 * 60 * 1000));
    await route.POST(post());
    const json = await (await route.GET(get())).json();
    expect(json.check.at).toBe(new Date(NOW.getTime() + 25 * 60 * 60 * 1000).toISOString());
  });

  it("reports the limit, and the last completed check, when the newest row never completed", async () => {
    await route.POST(post());
    vi.setSystemTime(new Date(NOW.getTime() + 25 * 60 * 60 * 1000));
    db!.rows.push({ id: "stuck", device_hash: db!.rows[0].device_hash, sale_id: "esp_abc", item_id: "esp_abc_0", status: "running", checked_at: new Date().toISOString(), detail: null });
    const json = await (await route.GET(get())).json();
    expect(json.check.at).toBe(NOW.toISOString());
    expect(json.nextCheckAt).toBe(new Date(NOW.getTime() + 49 * 60 * 60 * 1000).toISOString());
  });

  it("doesn't show one device's check to another, or to no device", async () => {
    await route.POST(post());
    expect((await (await route.GET(get(undefined, OTHER))).json()).check).toBeNull();
    expect((await (await route.GET(get(undefined, null))).json()).check).toBeNull();
  });

  it("rejects a bad id", async () => {
    expect((await route.GET(get("saleId=esp_abc"))).status).toBe(400);
    expect((await route.GET(get("saleId=esp_abc&itemId=no%20good"))).status).toBe(400);
  });
});
