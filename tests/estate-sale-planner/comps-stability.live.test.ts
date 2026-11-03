/**
 * Is the comps pass stable on real sales? (sold-comps design D22.) Runs the real `readComps`
 * three times on the 50 Lodge sales from the first keyed call and expects the same kept set and
 * band each time. Spends about 3¢ of model calls, so it runs only when asked:
 *
 *   ESP_LIVE_COMPS=1 op run --env-file=.env.local -- pnpm test:live tests/estate-sale-planner/comps-stability.live.test.ts
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { bandFromPrices } from "@/lib/estate-sale-planner/comps/band";
import { readComps } from "@/lib/estate-sale-planner/comps/read";
import type { SoldListing } from "@/lib/estate-sale-planner/comps/provider";
import { COMPS } from "@/lib/estate-sale-planner/config";

const run = process.env.ESP_LIVE_COMPS === "1" && !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);

describe.skipIf(!run)("comps pass on real sales", () => {
  it("keeps the same vintage No. 8s every run and prices them $50–$100", async () => {
    const fixture = JSON.parse(readFileSync("tests/estate-sale-planner/fixtures/compsapi-lodge-8.json", "utf8")) as {
      items: Array<{ title: string; price: number; last_sold: string; url: string }>;
    };
    const listings: SoldListing[] = fixture.items
      .slice(0, COMPS.maxListings)
      .map((i) => ({ title: i.title, priceCents: Math.round(i.price * 100), soldAt: i.last_sold, url: i.url }));
    const item = { name: "Lodge No. 8 cast iron skillet", markReading: "LODGE 8" };

    const runs = await Promise.all([0, 1, 2].map(() => readComps(item, listings)));
    const bands = runs.map((r) => bandFromPrices(r.matches.map((i) => listings[i].priceCents), COMPS.minMatches)?.band ?? "too-few");

    expect(new Set(runs.map((r) => r.matches.join(","))).size).toBe(1);
    expect(bands).toEqual(["$50–$100", "$50–$100", "$50–$100"]);
    for (const r of runs) expect(r.reason.length).toBeLessThanOrEqual(160);
  }, 120_000);
});
