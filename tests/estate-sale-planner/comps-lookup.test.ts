import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CostInput } from "@/lib/estate-sale-planner/costs";
import { lookupComps, type LookupDeps, type LookupItem } from "@/lib/estate-sale-planner/comps/lookup";
import { ProviderError, type CompsProvider, type SoldListing } from "@/lib/estate-sale-planner/comps/provider";
import { fixtureQuery } from "@/lib/estate-sale-planner/comps/query";

/** Just enough of the Supabase client for esp_comps: one keyed select and an upsert. */
function fakeDb(rows: Array<{ provider: string; query: string; query_norm: string; fetched_at: string; results: SoldListing[] }> = []) {
  const db = {
    rows,
    from: () => {
      const filters: Record<string, string> = {};
      const q = {
        select: () => q,
        eq: (col: string, val: string) => ((filters[col] = val), q),
        maybeSingle: async () => ({ data: rows.find((r) => r.provider === filters.provider && r.query_norm === filters.query_norm) ?? null, error: null }),
        upsert: async (row: any) => {
          const i = rows.findIndex((r) => r.provider === row.provider && r.query_norm === row.query_norm);
          if (i >= 0) rows[i] = row;
          else rows.push(row);
          return { error: null };
        },
      };
      return q;
    },
  };
  return db as unknown as SupabaseClient & { rows: typeof rows };
}

const listing = (priceDollars: number, n: number): SoldListing => ({
  title: `Lodge No. 8 cast iron skillet ${n}`,
  priceCents: priceDollars * 100,
  soldAt: `2026-10-${String(10 + n).padStart(2, "0")}T12:00:00Z`,
  url: `https://www.ebay.com/itm/${n}`,
});
const SOLD = [listing(40, 1), listing(60, 2), listing(85, 3), listing(120, 4), listing(5, 5)];

function fakeProvider(results: SoldListing[] | Error = SOLD): CompsProvider & { search: ReturnType<typeof vi.fn> } {
  return {
    name: "compsapi",
    pricePerRequestCents: 0.18,
    search: vi.fn(async () => {
      if (results instanceof Error) throw results;
      return results;
    }),
  };
}

const skillet: LookupItem = { name: "Lodge No. 8 skillet", band: "$100–$250", destination: "sell" };
const NOW = new Date("2026-11-02T12:00:00Z");

function deps(over: Partial<LookupDeps> = {}) {
  const rows: CostInput[] = [];
  const d: LookupDeps = {
    provider: fakeProvider(),
    db: fakeDb(),
    record: (r) => rows.push(r),
    writeQuery: vi.fn(async (item) => ({
      query: fixtureQuery(item),
      call: { data: {}, provider: "openai" as const, model: "gpt-5-nano", usage: { inputTokens: 120, outputTokens: 20 } },
    })),
    // The pass keeps the four skillets and drops the $5 lid.
    readComps: vi.fn(async (_item, listings: SoldListing[]) => ({
      matches: listings.map((l, i) => (l.priceCents >= 1000 ? i : -1)).filter((i) => i >= 0),
      reason: "Kept the four No. 8 skillets; dropped a lid.",
      call: { data: {}, provider: "openai" as const, model: "gpt-5-nano", usage: { inputTokens: 900, outputTokens: 40 } },
    })),
    now: () => NOW,
    ...over,
  };
  return { d, rows };
}

describe("lookupComps — the gate", () => {
  it("runs nothing for Keep, Donate, undecided or under-threshold items", async () => {
    for (const item of [
      { ...skillet, destination: "keep" as const },
      { ...skillet, destination: "donate" as const },
      { ...skillet, destination: undefined },
      { ...skillet, band: "$50–$100" },
    ]) {
      const { d, rows } = deps();
      expect(await lookupComps({ item }, d)).toEqual({ status: "gated" });
      expect(d.writeQuery).not.toHaveBeenCalled();
      expect(d.provider!.search).not.toHaveBeenCalled();
      expect(rows).toEqual([]);
    }
  });

  it("honours a raised threshold, and gates a tampered one on the $100 default", async () => {
    const raised = deps();
    expect(await lookupComps({ item: { ...skillet, band: "$250–$500" }, minBand: "$500–$2,000" }, raised.d)).toEqual({ status: "gated" });
    const tampered = deps();
    expect(await lookupComps({ item: { ...skillet, band: "$25–$50" }, minBand: "under $1" }, tampered.d)).toEqual({ status: "gated" });
    expect(tampered.d.writeQuery).not.toHaveBeenCalled();
    const lowered = deps();
    expect((await lookupComps({ item: { ...skillet, band: "$25–$50" }, minBand: "$25–$50" }, lowered.d)).status).toBe("ok");
  });

  it("writes one query and makes one lookup for a gated Sell item", async () => {
    const { d } = deps();
    await lookupComps({ item: skillet }, d);
    expect(d.writeQuery).toHaveBeenCalledTimes(1);
    expect(d.provider!.search).toHaveBeenCalledTimes(1);
  });

  it("looks a lot up as a set", async () => {
    const { d } = deps();
    const summary = await lookupComps({ item: { name: "Pyrex mixing bowls", band: "$100–$250", destination: "sell", lotCount: 6 } }, d);
    expect(summary.query).toBe("set of 6 Pyrex mixing bowls");
    expect(d.provider!.search).toHaveBeenCalledWith("set of 6 Pyrex mixing bowls", expect.anything());
  });
});

describe("lookupComps — the store", () => {
  it("calls the provider once on a first lookup and saves the results under the normalized query", async () => {
    const db = fakeDb();
    const { d, rows } = deps({ db });
    await lookupComps({ item: skillet, saleId: "esp_abc" }, d);
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0]).toMatchObject({ provider: "compsapi", query: "Lodge No. 8 skillet", query_norm: "lodge no 8 skillet", result_count: 5 });
    expect(rows.find((r) => r.kind === "lookup")).toMatchObject({ provider: "compsapi", cents: 0.18, saleId: "esp_abc" });
  });

  it("answers a repeat query inside 90 days from the store, from any sale, with a zero-cost cache hit", async () => {
    const db = fakeDb([{ provider: "compsapi", query: "lodge no 8 skillet", query_norm: "lodge no 8 skillet", fetched_at: "2026-09-01T00:00:00Z", results: SOLD }]);
    const { d, rows } = deps({ db });
    const summary = await lookupComps({ item: skillet, saleId: "esp_other" }, d);
    expect(d.provider!.search).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ status: "ok", cached: true, fetchedAt: "2026-09-01T00:00:00Z" });
    expect(rows.find((r) => r.kind === "lookup")).toMatchObject({ cents: 0, cacheHit: true });
  });

  it("fetches again and replaces results older than 90 days", async () => {
    const db = fakeDb([{ provider: "compsapi", query: "old", query_norm: "lodge no 8 skillet", fetched_at: "2026-07-01T00:00:00Z", results: [] }]);
    const { d } = deps({ db });
    const summary = await lookupComps({ item: skillet }, d);
    expect(d.provider!.search).toHaveBeenCalledTimes(1);
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0]).toMatchObject({ fetched_at: NOW.toISOString(), result_count: 5 });
    expect(summary.cached).toBe(false);
  });

  it("still answers with no database: every lookup is a miss and nothing is saved", async () => {
    const { d } = deps({ db: null });
    expect((await lookupComps({ item: skillet }, d)).status).toBe("ok");
  });
});

describe("lookupComps — the band from matching sales", () => {
  it("sets the band from 3+ matches and cites the most recent kept listings", async () => {
    const { d } = deps();
    const summary = await lookupComps({ item: skillet }, d);
    // Kept $40, $60, $85, $120: 25th–75th percentile $55–$94, median $72.50.
    expect(summary).toMatchObject({ status: "ok", matched: 4, found: 5, rangeCents: [5500, 9400], band: "$50–$100" });
    expect(summary.listings!.map((l) => l.url)).toEqual(["https://www.ebay.com/itm/4", "https://www.ebay.com/itm/3", "https://www.ebay.com/itm/2"]);
  });

  it("keeps the model's band with fewer than 3 matches", async () => {
    const { d } = deps({ readComps: vi.fn(async () => ({ matches: [0, 1], reason: "Two match.", call: null })) });
    const summary = await lookupComps({ item: skillet }, d);
    expect(summary).toMatchObject({ status: "too-few", matched: 2, found: 5 });
    expect(summary.band).toBeUndefined();
  });

  it("says too-few with no sold listings at all, and never runs the comps pass", async () => {
    const { d } = deps({ provider: fakeProvider([]) });
    expect(await lookupComps({ item: skillet }, d)).toMatchObject({ status: "too-few", found: 0 });
    expect(d.readComps).not.toHaveBeenCalled();
  });
});

describe("lookupComps — costs and failures", () => {
  it("records the query, the lookup and the comps pass", async () => {
    const { d, rows } = deps();
    await lookupComps({ item: skillet, saleId: "esp_abc" }, d);
    expect(rows.map((r) => r.kind)).toEqual(["query", "lookup", "comps"]);
    expect(rows[0]).toMatchObject({ model: "gpt-5-nano", inputTokens: 120, outputTokens: 20, saleId: "esp_abc" });
  });

  it("with no provider key: no query, no call, and a cost row that says lookups aren't configured", async () => {
    const { d, rows } = deps({ provider: null });
    expect(await lookupComps({ item: skillet }, d)).toEqual({ status: "not-configured" });
    expect(d.writeQuery).not.toHaveBeenCalled();
    expect(rows).toEqual([{ kind: "lookup", ok: false, error: "not-configured", cents: 0, saleId: undefined, sessionId: undefined }]);
  });

  it("maps a spent quota and a provider error, records them, and saves nothing", async () => {
    for (const [err, status] of [
      [new ProviderError("quota", "quota_reached"), "quota"],
      [new ProviderError("error", "timeout"), "error"],
      [new Error("boom"), "error"],
    ] as const) {
      const db = fakeDb();
      const { d, rows } = deps({ db, provider: fakeProvider(err) });
      expect((await lookupComps({ item: skillet }, d)).status).toBe(status);
      expect(rows.find((r) => r.kind === "lookup")).toMatchObject({ ok: false, cents: 0, error: status === "quota" ? "quota" : expect.stringMatching(/^error: /) });
      expect(db.rows).toEqual([]);
    }
  });

  it("a failed query or comps call comes back as an error, not a throw", async () => {
    const q = deps({ writeQuery: vi.fn(async () => Promise.reject(new Error("down"))) });
    expect((await lookupComps({ item: skillet }, q.d)).status).toBe("error");
    const r = deps({ readComps: vi.fn(async () => Promise.reject(new Error("down"))) });
    expect((await lookupComps({ item: skillet }, r.d)).status).toBe("error");
  });
});
