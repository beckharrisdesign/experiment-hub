/**
 * Do real searches find real sales? (sold-comps design D24.) Runs the whole lookup against the real
 * provider and models, with no database. Spends about 6¢, so it runs only when asked:
 *
 *   ESP_LIVE_COMPS=1 op run --env-file=.env.local -- pnpm test:live tests/estate-sale-planner/comps-search.live.test.ts
 */
import { describe, it, expect } from "vitest";
import { appendFileSync } from "node:fs";
import { lookupComps } from "@/lib/estate-sale-planner/comps/lookup";
import { providerFromEnv } from "@/lib/estate-sale-planner/comps/provider";
import { cleanQuery, writeQuery } from "@/lib/estate-sale-planner/comps/query";

const run = process.env.ESP_LIVE_COMPS === "1" && !!process.env.COMPS_API_KEY && !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);

async function check(item: { name: string; band: string; markReading?: string; note?: string }) {
  const out = await lookupComps({ item: { ...item, destination: "sell" }, fresh: true }, { provider: providerFromEnv(), db: null, record: () => {} });
  const d = out.detail;
  // Set ESP_LIVE_OUT to a path to read what each search found: the live config hides console output.
  if (process.env.ESP_LIVE_OUT) {
    const report = {
      item: item.name,
      status: out.status,
      tried: d?.tried,
      used: d?.query,
      matched: `${d?.matched} of ${d?.checked}`,
      band: out.band,
      range: out.rangeCents,
      reason: d?.reason,
      kept: d?.matches.map((l) => `$${l.priceCents / 100} ${l.title.slice(0, 60)}`),
    };
    appendFileSync(process.env.ESP_LIVE_OUT, `${JSON.stringify(report, null, 1)}\n`);
  }
  return out;
}

describe.skipIf(!run)("writing a search", () => {
  const items = [
    { name: "Signed mid-century Danish-style teak tambour roll-top secretary", note: "This is a signed vintage piece, bought at Austin Auction House in 2020", word: /teak/i },
    { name: "Solid wood butcher block dining table, modern", word: /butcher block/i },
    { name: "Lodge No. 8 cast iron skillet", markReading: "LODGE 8", word: /lodge/i },
    { name: "Signed brutalist brass wall sculpture by E L Karaback", markReading: "E L Karaback", word: /karaback/i },
  ];

  it("keeps what identifies the object in the first search, every run", async () => {
    const runs = await Promise.all(items.flatMap((item) => [0, 1, 2, 3, 4].map(async () => ({ item, written: await writeQuery(item) }))));
    if (process.env.ESP_LIVE_OUT) {
      appendFileSync(process.env.ESP_LIVE_OUT, runs.map((r) => `${r.item.name.slice(0, 24)} => ${cleanQuery(r.written.query)} | ${(r.written.broader ?? []).map(cleanQuery).join(" | ")}`).join("\n") + "\n");
    }
    for (const r of runs) expect(cleanQuery(r.written.query)).toMatch(r.item.word);
  }, 120_000);
});

describe.skipIf(!run)("searches on real sales", () => {
  it("prices a teak roll top desk with no known maker", async () => {
    const out = await check({
      name: "Signed mid-century Danish-style teak tambour roll-top secretary",
      band: "$250–$500",
      note: "This is a signed vintage piece, bought at Austin Auction House in 2020",
    });
    expect(out.detail!.found).toBeGreaterThan(0);
    expect(out.status).toBe("ok");
    // Desk organizers are the noise here: they must not set the price of a desk.
    expect(out.detail!.matches.every((l) => l.priceCents >= 10_000)).toBe(true);
  }, 120_000);

  it("still keeps a known maker strict", async () => {
    const out = await check({ name: "Lodge No. 8 cast iron skillet", band: "$100–$250", markReading: "LODGE 8" });
    expect(out.status).toBe("ok");
    expect(out.detail!.matches.every((l) => /lodge/i.test(l.title))).toBe(true);
  }, 120_000);

  it("finds something for an everyday piece of furniture", async () => {
    const out = await check({ name: "Solid wood butcher block dining table, modern", band: "$250–$500" });
    expect(out.detail!.found).toBeGreaterThan(0);
  }, 120_000);
});
