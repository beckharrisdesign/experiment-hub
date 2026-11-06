// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { DEVICE_COOKIE, hashDevice } from "@/lib/estate-sale-planner/device";
import type { CompsSummary } from "@/lib/estate-sale-planner/comps/summary";

const DEVICE = "a".repeat(43);
const OTHER = "b".repeat(43);
const NOW = new Date("2026-11-06T16:12:00Z");

type Row = Record<string, any>;

/** Just enough of the service-role client for esp_comps_checks. */
function fakeDb(rows: Row[] = [], failReads = false) {
  return {
    rows,
    from: () => {
      const filters: Array<[string, unknown]> = [];
      const q: any = {
        select: () => q,
        eq: (k: string, v: unknown) => (filters.push([k, v]), q),
        order: () => q,
        limit: () => q,
        maybeSingle: async () => {
          if (failReads) return { data: null, error: new Error("down") };
          const found = rows.filter((r) => filters.every(([k, v]) => r[k] === v)).sort((a, b) => b.checked_at.localeCompare(a.checked_at));
          return { data: found[0] ?? null, error: null };
        },
        insert: async (row: Row) => (rows.push(row), { error: null }),
      };
      return q;
    },
  };
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
    db = fakeDb([], true);
    const json = await (await route.POST(post())).json();
    expect(json).toMatchObject({ success: true, status: "error" });
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
