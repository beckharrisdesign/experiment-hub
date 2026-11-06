import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CostInput } from "@/lib/estate-sale-planner/costs";
import { lookupComps, type LookupDeps, type LookupItem } from "@/lib/estate-sale-planner/comps/lookup";
import { ProviderError, type CompsProvider, type SoldListing } from "@/lib/estate-sale-planner/comps/provider";
import { fixtureQuery, normalizeQuery } from "@/lib/estate-sale-planner/comps/query";

type CompsRow = { provider: string; query: string; query_norm: string; fetched_at: string; results: SoldListing[] };
type ReadRow = { provider: string; subject: string; query: string; query_norm: string; comps_fetched_at: string; matches: number[]; reason: string; model: string | null };

/** Just enough of the Supabase client for esp_comps and esp_comps_reads: keyed selects and upserts. */
function fakeDb(rows: CompsRow[] = [], reads: ReadRow[] = []) {
  const tables: Record<string, any[]> = { esp_comps: rows, esp_comps_reads: reads };
  const db = {
    rows,
    reads,
    from: (table: string) => {
      const list = tables[table];
      const filters: Record<string, string> = {};
      const q = {
        select: () => q,
        eq: (col: string, val: string) => ((filters[col] = val), q),
        maybeSingle: async () => ({ data: list.find((r) => Object.entries(filters).every(([k, v]) => r[k] === v)) ?? null, error: null }),
        upsert: async (row: any, opts: { onConflict: string }) => {
          const keys = opts.onConflict.split(",");
          const i = list.findIndex((r) => keys.every((k) => r[k] === row[k]));
          if (i >= 0) list[i] = row;
          else list.push(row);
          return { error: null };
        },
      };
      return q;
    },
  };
  return db as unknown as SupabaseClient & { rows: CompsRow[]; reads: ReadRow[] };
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

describe("lookupComps — the same item gets the same answer (design D22)", () => {
  it("remembers the search and the kept sales under the item's subject", async () => {
    const db = fakeDb();
    const { d } = deps({ db });
    await lookupComps({ item: { ...skillet, markReading: "LODGE 8" } }, d);
    expect(db.reads).toHaveLength(1);
    expect(db.reads[0]).toMatchObject({
      provider: "compsapi",
      subject: "lodge no 8 skillet|lodge 8|1",
      query: "Lodge No. 8 skillet",
      query_norm: "lodge no 8 skillet",
      comps_fetched_at: NOW.toISOString(),
      matches: [0, 1, 2, 3],
    });
  });

  it("a repeat from any sale reuses both: no model call, no provider call, the same band", async () => {
    const db = fakeDb();
    const first = deps({ db });
    const a = await lookupComps({ item: skillet, saleId: "esp_one" }, first.d);
    const second = deps({ db });
    const b = await lookupComps({ item: { ...skillet, name: "lodge no 8 SKILLET", band: "$250–$500" }, saleId: "esp_two" }, second.d);
    expect(second.d.writeQuery).not.toHaveBeenCalled();
    expect(second.d.readComps).not.toHaveBeenCalled();
    expect(second.d.provider!.search).not.toHaveBeenCalled();
    expect(b).toMatchObject({ status: "ok", band: a.band, rangeCents: a.rangeCents, matched: a.matched, query: a.query, cached: true });
    expect(second.rows).toEqual([{ kind: "lookup", provider: "compsapi", cents: 0, cacheHit: true, saleId: "esp_two", sessionId: undefined }]);
  });

  it("once the sales are fetched again, keeps the search but reads the new sales", async () => {
    const db = fakeDb(
      [{ provider: "compsapi", query: "Lodge No. 8 skillet", query_norm: "lodge no 8 skillet", fetched_at: "2026-07-01T00:00:00Z", results: [] }],
      [{ provider: "compsapi", subject: "lodge no 8 skillet||1", query: "Lodge No. 8 skillet", query_norm: "lodge no 8 skillet", comps_fetched_at: "2026-07-01T00:00:00Z", matches: [], reason: "None.", model: "gpt-5" }],
    );
    const { d } = deps({ db });
    const summary = await lookupComps({ item: skillet }, d);
    expect(d.writeQuery).not.toHaveBeenCalled();
    expect(d.provider!.search).toHaveBeenCalledWith("Lodge No. 8 skillet", expect.anything());
    expect(d.readComps).toHaveBeenCalledTimes(1);
    expect(summary.status).toBe("ok");
    expect(db.reads[0]).toMatchObject({ comps_fetched_at: NOW.toISOString(), matches: [0, 1, 2, 3] });
  });

  it("a different subject (a new mark, a lot) is a new search", async () => {
    const db = fakeDb();
    await lookupComps({ item: skillet }, deps({ db }).d);
    const marked = deps({ db });
    await lookupComps({ item: { ...skillet, markReading: "LODGE 8 SK" } }, marked.d);
    expect(marked.d.writeQuery).toHaveBeenCalledTimes(1);
    expect(db.reads.map((r) => r.subject)).toEqual(["lodge no 8 skillet||1", "lodge no 8 skillet|lodge 8 sk|1"]);
  });

  it("doesn't remember a search that found nothing, or anything when the read fails", async () => {
    const none = fakeDb();
    await lookupComps({ item: skillet }, deps({ db: none, provider: fakeProvider([]) }).d);
    expect(none.reads).toEqual([]);
    const failed = fakeDb();
    await lookupComps({ item: skillet }, deps({ db: failed, readComps: vi.fn(async () => Promise.reject(new Error("down"))) }).d);
    expect(failed.reads).toEqual([]);
  });
});

describe("lookupComps — a check from the button", () => {
  it("pulls fresh sold listings even when saved ones are still in date, and reads them", async () => {
    const saved: CompsRow = { provider: "compsapi", query: fixtureQuery(skillet), query_norm: normalizeQuery(fixtureQuery(skillet)), fetched_at: "2026-11-01T12:00:00Z", results: SOLD };
    const provider = fakeProvider();
    const { d } = deps({ provider, db: fakeDb([saved]) });
    const out = await lookupComps({ item: skillet, fresh: true }, d);
    expect(provider.search).toHaveBeenCalledTimes(1);
    expect(d.readComps).toHaveBeenCalledTimes(1);
    expect(out).toMatchObject({ status: "ok", cached: false, fetchedAt: NOW.toISOString() });
  });

  it("reports everything that went into an answer, with every source", async () => {
    const { d } = deps();
    const out = await lookupComps({ item: skillet, fresh: true }, d);
    expect(out.detail).toMatchObject({
      query: fixtureQuery(skillet),
      queryModel: "gpt-5-nano",
      queryReused: false,
      provider: "compsapi",
      listingsAt: NOW.toISOString(),
      found: 5,
      checked: 5,
      readModel: "gpt-5-nano",
      matched: 4,
      reason: "Kept the four No. 8 skillets; dropped a lid.",
      band: out.band,
      rangeCents: out.rangeCents,
    });
    // In the order the check ranked them; `listings` keeps only a few, the detail keeps them all.
    expect(out.detail!.matches.map((l) => l.url)).toEqual([1, 2, 3, 4].map((n) => `https://www.ebay.com/itm/${n}`));
    expect(out.detail!.leftOut.map((l) => l.url)).toEqual(["https://www.ebay.com/itm/5"]);
  });

  it("says the search was reused rather than naming a model that didn't write it", async () => {
    const db = fakeDb();
    await lookupComps({ item: skillet, fresh: true }, deps({ db }).d);
    const out = await lookupComps({ item: skillet, fresh: true }, deps({ db }).d);
    expect(out.detail).toMatchObject({ queryReused: true });
    expect(out.detail!.queryModel).toBeUndefined();
  });

  it("reports a too-few answer too, and nothing for one that couldn't run", async () => {
    const few = await lookupComps({ item: skillet, fresh: true }, deps({ provider: fakeProvider([SOLD[0]]) }).d);
    expect(few).toMatchObject({ status: "too-few", detail: { found: 1, matched: 1 } });
    const none = await lookupComps({ item: skillet, fresh: true }, deps({ provider: fakeProvider([]) }).d);
    expect(none).toMatchObject({ status: "too-few", detail: { found: 0, matched: 0, matches: [], leftOut: [] } });
    const failed = await lookupComps({ item: skillet, fresh: true }, deps({ provider: fakeProvider(new ProviderError("quota", "spent")) }).d);
    expect(failed.status).toBe("quota");
    expect(failed.detail).toBeUndefined();
  });
});

describe("lookupComps — reading a second batch", () => {
  const many = (n: number) => Array.from({ length: n }, (_, i) => listing(i % 2 ? 500 : 20, i));
  const keepOver = (cents: number, reason = "Kept the desks.") =>
    vi.fn(async (_item: unknown, listings: SoldListing[]) => ({
      matches: listings.map((l, i) => (l.priceCents >= cents ? i : -1)).filter((i) => i >= 0),
      reason,
      call: { data: {}, provider: "openai" as const, model: "gpt-5", usage: { inputTokens: 900, outputTokens: 40 } },
    }));

  it("doesn't pay for it when the first batch finds enough", async () => {
    const readComps = keepOver(100_00);
    const out = await lookupComps({ item: skillet, fresh: true }, deps({ provider: fakeProvider(many(50)), readComps }).d);
    expect(readComps).toHaveBeenCalledTimes(1);
    expect(out.detail).toMatchObject({ checked: 25, matched: 12 });
  });

  it("reads the next listings when the first batch comes up short, and keeps both batches' matches", async () => {
    const listings = many(50).map((l, i) => ({ ...l, priceCents: i === 2 || i === 30 || i === 40 ? 60_000 : 2_000 }));
    const readComps = keepOver(100_00);
    const { d, rows } = deps({ provider: fakeProvider(listings), readComps });
    const out = await lookupComps({ item: skillet, fresh: true }, d);
    expect(readComps).toHaveBeenCalledTimes(2);
    expect(readComps.mock.calls[1][1]).toEqual(listings.slice(25, 50));
    expect(out).toMatchObject({ status: "ok", matched: 3 });
    expect(out.detail).toMatchObject({ checked: 50, matched: 3 });
    expect(out.detail!.leftOut).toHaveLength(47);
    expect(rows.filter((r) => r.kind === "comps")).toHaveLength(2);
  });

  it("remembers matches against the whole list, so a repeat gets the same answer", async () => {
    const listings = many(50).map((l, i) => ({ ...l, priceCents: i === 2 || i === 30 || i === 40 ? 60_000 : 2_000 }));
    const db = fakeDb();
    await lookupComps({ item: skillet }, deps({ db, provider: fakeProvider(listings), readComps: keepOver(100_00) }).d);
    expect(db.reads[0].matches).toEqual([2, 30, 40]);
    const again = deps({ db, provider: fakeProvider(listings) });
    const out = await lookupComps({ item: skillet }, again.d);
    expect(again.d.readComps).not.toHaveBeenCalled();
    expect(out).toMatchObject({ status: "ok", matched: 3 });
  });

  it("stops at what's there, and keeps the first batch if the second fails", async () => {
    const short = keepOver(100_000);
    await lookupComps({ item: skillet, fresh: true }, deps({ provider: fakeProvider(many(25)), readComps: short }).d);
    expect(short).toHaveBeenCalledTimes(1);

    const first = keepOver(100_00);
    const flaky = vi.fn(async (item: LookupItem, batch: SoldListing[]) => {
      if (flaky.mock.calls.length > 1) throw new Error("down");
      return first(item, batch);
    });
    const listings = many(50).map((l, i) => ({ ...l, priceCents: i < 2 ? 60_000 : 2_000 }));
    const { d, rows } = deps({ provider: fakeProvider(listings), readComps: flaky as unknown as LookupDeps["readComps"] });
    const out = await lookupComps({ item: skillet, fresh: true }, d);
    expect(out).toMatchObject({ status: "too-few", matched: 2, detail: { checked: 25 } });
    expect(rows.some((r) => r.kind === "comps" && r.ok === false)).toBe(true);
  });
});

describe("lookupComps — broadening a search that finds too little", () => {
  /** A provider that answers by search, and an empty result for anything else. */
  const byQuery = (results: Record<string, SoldListing[] | Error>) => {
    const provider = fakeProvider([]);
    provider.search = vi.fn(async (q: string) => {
      const r = results[q] ?? [];
      if (r instanceof Error) throw r;
      return r;
    });
    return provider;
  };
  const ladder = (query: string, broader: string[]) =>
    vi.fn(async () => ({ query, broader, call: { data: {}, provider: "openai" as const, model: "gpt-5-nano", usage: { inputTokens: 120, outputTokens: 20 } } }));
  const desk: LookupItem = { name: "Danish teak tambour secretary", band: "$250–$500", destination: "sell" };

  it("stops at the first search with enough listings", async () => {
    const provider = byQuery({ "teak tambour secretary": [SOLD[0]], "teak roll top desk": SOLD, "roll top desk": SOLD });
    const { d, rows } = deps({ provider, writeQuery: ladder("teak tambour secretary", ["teak roll top desk", "roll top desk"]) });
    const out = await lookupComps({ item: desk, fresh: true }, d);
    expect(provider.search.mock.calls.map((c) => c[0])).toEqual(["teak tambour secretary", "teak roll top desk"]);
    expect(out).toMatchObject({ status: "ok", query: "teak roll top desk", found: 5 });
    expect(out.detail).toMatchObject({ query: "teak roll top desk", queryModel: "gpt-5-nano", queryReused: false });
    expect(out.detail!.tried).toEqual([{ query: "teak tambour secretary", found: 1 }, { query: "teak roll top desk", found: 5 }]);
    expect(rows.filter((r) => r.kind === "lookup")).toHaveLength(2);
    expect(rows.filter((r) => r.kind === "query")).toHaveLength(1);
  });

  it("makes at most three searches, and uses the one that found the most", async () => {
    const provider = byQuery({ "q a": [SOLD[0]], "q b": SOLD.slice(0, 3), "q c": SOLD.slice(0, 2), "q d": SOLD });
    const out = await lookupComps({ item: desk, fresh: true }, deps({ provider, writeQuery: ladder("q a", ["q b", "q c", "q d"]) }).d);
    expect(provider.search).toHaveBeenCalledTimes(3);
    expect(out).toMatchObject({ query: "q b", found: 3 });
  });

  it("doesn't pay twice for the same search", async () => {
    const provider = byQuery({ "Teak desk": [SOLD[0]] });
    await lookupComps({ item: desk, fresh: true }, deps({ provider, writeQuery: ladder("Teak desk", ["teak  DESK", "teak-desk"]) }).d);
    expect(provider.search).toHaveBeenCalledTimes(1);
  });

  it("won't broaden down to a single word", async () => {
    const provider = byQuery({ "teak desk": [SOLD[0]], desk: SOLD });
    const out = await lookupComps({ item: desk, fresh: true }, deps({ provider, writeQuery: ladder("teak desk", ["desk"]) }).d);
    expect(provider.search.mock.calls.map((c) => c[0])).toEqual(["teak desk"]);
    expect(out.found).toBe(1);
  });

  it("gives up after a dead search with no broader one, as too few", async () => {
    const provider = byQuery({});
    const out = await lookupComps({ item: desk, fresh: true }, deps({ provider, writeQuery: ladder("nothing", []) }).d);
    expect(provider.search).toHaveBeenCalledTimes(1);
    expect(out).toMatchObject({ status: "too-few", found: 0, detail: { tried: [{ query: "nothing", found: 0 }] } });
  });

  it("writes a new search when a remembered one no longer finds enough", async () => {
    const db = fakeDb([], [{ provider: "compsapi", subject: "danish teak tambour secretary||1", query: "Unknown Maker tambour desk", query_norm: "unknown maker tambour desk", comps_fetched_at: "2026-11-01T00:00:00Z", matches: [], reason: "No sold listings came back.", model: "gpt-5-nano" }]);
    const provider = byQuery({ "teak roll top desk": SOLD });
    const writeQuery = ladder("teak roll top desk", []);
    const out = await lookupComps({ item: desk, fresh: true }, deps({ db, provider, writeQuery }).d);
    // The dead search is cleaned before it's tried again, so the placeholder is never sent.
    expect(provider.search.mock.calls.map((c) => c[0])).toEqual(["tambour desk", "teak roll top desk"]);
    expect(writeQuery).toHaveBeenCalledTimes(1);
    expect(out).toMatchObject({ status: "ok", query: "teak roll top desk", detail: { queryReused: false, queryModel: "gpt-5-nano" } });
    expect(db.reads[0]).toMatchObject({ query: "teak roll top desk" });
  });

  it("keeps a remembered search that still finds enough, with no model call", async () => {
    const db = fakeDb();
    await lookupComps({ item: skillet, fresh: true }, deps({ db }).d);
    const again = deps({ db });
    const out = await lookupComps({ item: skillet, fresh: true }, again.d);
    expect(again.d.writeQuery).not.toHaveBeenCalled();
    expect(out.detail).toMatchObject({ queryReused: true, tried: [{ query: "Lodge No. 8 skillet", found: 5 }] });
  });

  it("uses what it has when a later search fails, and reports a failure with nothing to show", async () => {
    const provider = byQuery({ "q a": SOLD.slice(0, 4), "q b": new ProviderError("error", "down") });
    const out = await lookupComps({ item: desk, fresh: true }, deps({ provider, writeQuery: ladder("q a", ["q b"]) }).d);
    expect(provider.search).toHaveBeenCalledTimes(2);
    expect(out).toMatchObject({ status: "ok", query: "q a", found: 4 });
    const failing = byQuery({ a: new ProviderError("quota", "spent") });
    expect(await lookupComps({ item: desk, fresh: true }, deps({ provider: failing, writeQuery: ladder("a", ["b"]) }).d)).toMatchObject({ status: "quota" });
  });

  it("keeps what a remembered search found when writing a new one fails", async () => {
    const db = fakeDb();
    await lookupComps({ item: skillet, fresh: true }, deps({ db, provider: fakeProvider(SOLD) }).d);
    const out = await lookupComps({ item: skillet, fresh: true }, deps({ db, provider: fakeProvider(SOLD.slice(0, 4)), writeQuery: vi.fn(async () => Promise.reject(new Error("down"))) }).d);
    expect(out).toMatchObject({ status: "ok", found: 4 });
  });
});

describe("lookupComps — too few matches", () => {
  const provider = (results: Record<string, SoldListing[]>) => {
    const p = fakeProvider([]);
    p.search = vi.fn(async (q: string) => results[q] ?? []);
    return p;
  };
  const ladder = (query: string, broader: string[]) => vi.fn(async () => ({ query, broader, call: null }));
  const sold = (title: string, n: number, dollars = 500): SoldListing => ({ title, priceCents: dollars * 100, soldAt: "2026-10-02T12:00:00Z", url: `https://www.ebay.com/itm/${n}`, image: `https://i.ebayimg.com/${n}.jpg` });
  /** Keeps desks, in the order given, whatever the search. */
  const keepDesks = () =>
    vi.fn(async (_item: unknown, batch: SoldListing[]) => ({
      matches: batch.map((l, i) => (/desk/i.test(l.title) ? i : -1)).filter((i) => i >= 0),
      reason: "Kept the desks.",
      call: { data: {}, provider: "openai" as const, model: "gpt-5", usage: { inputTokens: 900, outputTokens: 40 } },
    }));
  const item: LookupItem = { name: "Mid-century barrel top desk", band: "$250–$500", destination: "sell" };
  const keys = Array.from({ length: 14 }, (_, i) => sold("Barrel key", i, 14));

  it("tries the next search when plenty of listings aren't real matches", async () => {
    const results = {
      "barrel top desk": [...keys, sold("Barrel top desk", 100)],
      "roll top desk": [sold("Roll top desk", 101), sold("Roll top desk", 102), sold("Lamp", 103)],
    };
    const p = provider(results);
    const readComps = keepDesks();
    const out = await lookupComps({ item, fresh: true }, deps({ provider: p, writeQuery: ladder("barrel top desk", ["roll top desk"]), readComps }).d);
    expect(p.search.mock.calls.map((c) => c[0])).toEqual(["barrel top desk", "roll top desk"]);
    expect(readComps).toHaveBeenCalledTimes(2);
    expect(out).toMatchObject({ status: "ok", matched: 3 });
    expect(out.detail!.matches.map((l) => l.url)).toEqual([100, 101, 102].map((n) => `https://www.ebay.com/itm/${n}`));
    expect(out.detail!.tried).toEqual([{ query: "barrel top desk", found: 15 }, { query: "roll top desk", found: 3 }]);
    expect(out.detail!.checked).toBe(18);
  });

  it("doesn't pay to read the same listing twice, or count it twice", async () => {
    const shared = sold("Barrel top desk", 100);
    const p = provider({ "barrel top desk": [...keys, shared], "roll top desk": [shared, sold("Roll top desk", 101)] });
    const readComps = keepDesks();
    const out = await lookupComps({ item, fresh: true }, deps({ provider: p, writeQuery: ladder("barrel top desk", ["roll top desk"]), readComps }).d);
    expect(readComps.mock.calls[1][1].map((l: SoldListing) => l.url)).toEqual(["https://www.ebay.com/itm/101"]);
    expect(out.matched).toBe(2);
  });

  it("doesn't search further once enough match", async () => {
    const five = [1, 2, 3, 4, 5].map((n) => sold("Desk", n));
    const p = provider({ "barrel top desk": five, "roll top desk": [sold("Desk", 6)] });
    const out = await lookupComps({ item, fresh: true }, deps({ provider: p, writeQuery: ladder("barrel top desk", ["roll top desk"]), readComps: keepDesks() }).d);
    expect(p.search).toHaveBeenCalledTimes(1);
    expect(out.matched).toBe(5);
  });

  it("stops at three reads, whatever is left", async () => {
    const lots = (start: number) => Array.from({ length: 50 }, (_, i) => sold("Barrel key", start + i, 14));
    const p = provider({ "s a": lots(0), "s b": lots(100), "s c": lots(200) });
    const readComps = keepDesks();
    await lookupComps({ item, fresh: true }, deps({ provider: p, writeQuery: ladder("s a", ["s b", "s c"]), readComps }).d);
    expect(readComps).toHaveBeenCalledTimes(3);
    expect(p.search).toHaveBeenCalledTimes(2);
  });

  it("keeps what it has when a later search or read fails", async () => {
    const p = provider({ "barrel top desk": [...keys, sold("Barrel top desk", 100)] });
    p.search = vi.fn(async (q: string) => {
      if (q === "roll top desk") throw new ProviderError("error", "down");
      return [...keys, sold("Barrel top desk", 100)];
    });
    const failedSearch = await lookupComps({ item, fresh: true }, deps({ provider: p, writeQuery: ladder("barrel top desk", ["roll top desk"]), readComps: keepDesks() }).d);
    expect(failedSearch).toMatchObject({ status: "too-few", matched: 1 });

    const q = provider({ "barrel top desk": [...keys, sold("Barrel top desk", 100)], "roll top desk": [sold("Roll top desk", 101)] });
    const first = keepDesks();
    const flaky = vi.fn(async (a: LookupItem, b: SoldListing[]) => {
      if (flaky.mock.calls.length > 1) throw new Error("down");
      return first(a, b);
    });
    const failedRead = await lookupComps({ item, fresh: true }, deps({ provider: q, writeQuery: ladder("barrel top desk", ["roll top desk"]), readComps: flaky as unknown as LookupDeps["readComps"] }).d);
    expect(failedRead).toMatchObject({ status: "too-few", matched: 1 });
  });

  it("remembers the search that matched the most", async () => {
    const db = fakeDb();
    const p = provider({ "barrel top desk": keys, "roll top desk": [sold("Roll top desk", 101), sold("Roll top desk", 102)] });
    await lookupComps({ item, fresh: true }, deps({ db, provider: p, writeQuery: ladder("barrel top desk", ["roll top desk"]), readComps: keepDesks() }).d);
    expect(db.reads[0]).toMatchObject({ query: "roll top desk", matches: [0, 1] });
  });
});
