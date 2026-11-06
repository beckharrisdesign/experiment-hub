import { describe, it, expect, vi } from "vitest";
import { bandForDollars, bandFromPrices, percentile } from "@/lib/estate-sale-planner/comps/band";
import { compsApiProvider, compsApiUrl, parseCompsApiItems } from "@/lib/estate-sale-planner/comps/compsapi";
import { ProviderError, providerFromEnv } from "@/lib/estate-sale-planner/comps/provider";
import { cleanQuery, fixtureQuery, normalizeQuery, queryUserText, QUERY_PROMPT, QuerySchema } from "@/lib/estate-sale-planner/comps/query";
import { clipText, subjectKey } from "@/lib/estate-sale-planner/comps/normalize";
import { READ_PROMPT, ReadSchema } from "@/lib/estate-sale-planner/comps/read";
import { isFresh } from "@/lib/estate-sale-planner/comps/store";
import { openAITextBody } from "@/lib/estate-sale-planner/comps/text";

describe("normalizeQuery", () => {
  it("is the cache key: case, accents, punctuation and spacing fold together", () => {
    expect(normalizeQuery("Lodge No. 8 skillet")).toBe("lodge no 8 skillet");
    expect(normalizeQuery("  lodge   no 8, skillet! ")).toBe("lodge no 8 skillet");
    expect(normalizeQuery("Vintage Hermès scarf")).toBe("vintage hermes scarf");
  });
  it("keeps # and a decimal point inside a number, and word order", () => {
    expect(normalizeQuery("Pyrex #403 1.5 qt bowl")).toBe("pyrex #403 1.5 qt bowl");
    expect(normalizeQuery("skillet lodge")).not.toBe(normalizeQuery("lodge skillet"));
  });
});

describe("the query step", () => {
  it("tells the model about a set, the mark and the family's note", () => {
    const text = queryUserText({ name: "Pyrex bowls", lotCount: 6, markReading: "PYREX 403", note: "Mom's, 1960s" });
    expect(text).toContain("set of 6");
    expect(text).toContain("PYREX 403");
    expect(text).toContain("Mom's, 1960s");
  });
  it("falls back to the name with no model key, a lot as a set", () => {
    expect(fixtureQuery({ name: "Lodge skillet" })).toBe("Lodge skillet");
    expect(fixtureQuery({ name: "Pyrex bowls", lotCount: 6 })).toBe("set of 6 Pyrex bowls");
  });
  it("never accepts a search of only spaces, and trims the rest", () => {
    expect(QuerySchema.safeParse({ query: "   ", broader: [] }).success).toBe(false);
    expect(QuerySchema.parse({ query: "  lodge skillet ", broader: [] }).query).toBe("lodge skillet");
  });

  it("a long answer is clipped, never a failed lookup (2026-11-03: a 161-character reason threw)", () => {
    expect(QuerySchema.safeParse({ query: "x ".repeat(60), broader: [] }).success).toBe(true);
    expect(ReadSchema.safeParse({ matches: [1], reason: "y ".repeat(150) }).success).toBe(true);
    expect(clipText("Le Creuset 5.5 qt round Dutch oven enamel cast iron Flame Orange", 30)).toBe("Le Creuset 5.5 qt round Dutch");
    expect(clipText("Kept the three vintage No. 8s.", 160)).toBe("Kept the three vintage No. 8s.");
    expect(clipText("Supercalifragilisticexpialidocious", 10)).toBe("Supercalif");
  });

  it("asks for a short search, the maker's own number kept", () => {
    expect(QUERY_PROMPT).toMatch(/No\. 8/);
  });

  it("writes the search on the smallest OpenAI model and checks the sales on gpt-5 (design D22)", () => {
    const query = openAITextBody({ system: "s", user: "u", schema: QuerySchema, name: "comps_query", step: "query" });
    expect(query.model).toBe("gpt-5-nano");
    expect(query.messages[1]).toEqual({ role: "user", content: "u" });
    expect(openAITextBody({ system: "s", user: "u", schema: ReadSchema, name: "comps_read", step: "read" }).model).toBe("gpt-5");
  });
});

describe("the comps pass prompt", () => {
  it("knows a maker's number is a size, not inches", () => {
    expect(READ_PROMPT).toMatch(/a No\. 8 skillet is not an 8-inch skillet/);
  });
});

describe("subjectKey", () => {
  it("is what a lookup is about: name, mark and lot size, normalized", () => {
    expect(subjectKey({ name: "Lodge No. 8 skillet", markReading: "LODGE 8" })).toBe("lodge no 8 skillet|lodge 8|1");
    expect(subjectKey({ name: "lodge no 8 SKILLET!", markReading: " Lodge 8 " })).toBe("lodge no 8 skillet|lodge 8|1");
    expect(subjectKey({ name: "Pyrex bowls", lotCount: 6 })).toBe("pyrex bowls||6");
  });
});

describe("band math", () => {
  it("interpolates percentiles", () => {
    expect(percentile([10, 20, 30, 40], 0.5)).toBe(25);
    expect(percentile([10, 20, 30, 40], 0.25)).toBe(17.5);
  });
  it("puts a price in the band whose low end it reaches", () => {
    expect(bandForDollars(0.5)).toBe("under $1");
    expect(bandForDollars(100)).toBe("$100–$250");
    expect(bandForDollars(99.99)).toBe("$50–$100");
    expect(bandForDollars(5000)).toBe("over $2,000");
  });
  it("needs the minimum number of matches, then sets a whole-dollar range and the median's band", () => {
    expect(bandFromPrices([4000, 6000], 3)).toBeNull();
    expect(bandFromPrices([4000, 6000, 8500], 3)).toEqual({ rangeCents: [5000, 7300], band: "$50–$100", medianCents: 6000 });
  });
});

describe("the CompsAPI adapter (docs read 2026-11-02)", () => {
  it("asks /v1/sold for eBay US sales with the query", () => {
    const url = new URL(compsApiUrl("Lodge No. 8 skillet"));
    expect(`${url.origin}${url.pathname}`).toBe("https://api.compsapi.com/v1/sold");
    expect(url.searchParams.get("q")).toBe("Lodge No. 8 skillet");
    expect(url.searchParams.get("site")).toBe("US");
  });

  it("reads items in dollars into cents and drops what it can't read", () => {
    const parsed = parseCompsApiItems({
      ok: true,
      items: [
        { title: "Lodge 8 skillet", price: 42.5, last_sold: "2026-10-05T22:46:00Z", url: "https://www.ebay.com/itm/1", image: "https://i.ebayimg.com/1.jpg" },
        { title: "No price", url: "https://www.ebay.com/itm/2" },
        { title: "Bad link", price: 10, url: "javascript:alert(1)" },
        { title: "Price as text", price: "19.99", url: "https://www.ebay.com/itm/3" },
      ],
    });
    expect(parsed).toEqual([
      { title: "Lodge 8 skillet", priceCents: 4250, soldAt: "2026-10-05T22:46:00Z", url: "https://www.ebay.com/itm/1", image: "https://i.ebayimg.com/1.jpg" },
      { title: "Price as text", priceCents: 1999, soldAt: "", url: "https://www.ebay.com/itm/3" },
    ]);
    expect(parseCompsApiItems({ ok: true })).toEqual([]);
  });

  it("reads a real /v1/sold body (first keyed call, 2026-11-03), ignoring the fields it doesn't use", () => {
    // Trimmed from the live answer for "Lodge No. 8 cast iron skillet": 50 items, all of this shape.
    const live = {
      ok: true, query: "Lodge No. 8 cast iron skillet", page: 1, ms: 777, no_results: false, count: 50,
      cached: false, cached_age_s: 0, next_page: true, days: 90, size: 50, source: "ebay", site: "US",
      items: [
        {
          item_id: "397358335833", title: "Lodge Pre-seasoned 8 Inch Cast Iron Skillet Model L6OG3 NEW FREE SHIPPING",
          last_sold: "2026-11-03T07:23:00Z", price: 28.99, units_sold: 1, total_sales: 28.99, format: "FIXED_PRICE",
          bids: 0, ended_at: "2026-11-03T07:24:03.000Z", shipping_cost: null, free_shipping_pct: 100.0,
          url: "https://www.ebay.com/itm/397358335833", image: "https://i.ebayimg.com/00/s/MTI3N1g5MDA=/z/dxMAAeSwVuppMowu/$_57.PNG", us_sale: true,
        },
        {
          item_id: "297918648996", title: "Lodge Pre-Seasoned Cast Iron Lid - for Skillet, 8 Inch, Black ",
          last_sold: "2026-11-03T07:23:00Z", price: 25.99, units_sold: 2, total_sales: 51.98, format: "FIXED_PRICE",
          bids: 0, ended_at: "2026-11-08T14:17:02.000Z", shipping_cost: null, free_shipping_pct: 100.0,
          url: "https://www.ebay.com/itm/297918648996", image: "https://i.ebayimg.com/00/s/NzQ3WDE2MDA=/z/6e8AAeSweG9pX8kY/$_1.JPG", us_sale: true,
        },
      ],
    };
    const parsed = parseCompsApiItems(live);
    expect(parsed).toHaveLength(2);
    // `price` is per unit, not `total_sales`: two lids sold at $25.99 each is 2599, not 5198.
    expect(parsed[1]).toMatchObject({ title: "Lodge Pre-Seasoned Cast Iron Lid - for Skillet, 8 Inch, Black", priceCents: 2599, soldAt: "2026-11-03T07:23:00Z" });
  });

  it("sends the key and a User-Agent, and maps quota and errors", async () => {
    const fetchOk = vi.fn(async () => new Response(JSON.stringify({ ok: true, items: [] }), { status: 200 }));
    await compsApiProvider("k_123", fetchOk as unknown as typeof fetch).search("q", AbortSignal.timeout(1000));
    const headers = (fetchOk.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Record<string, string>;
    expect(headers["X-API-Key"]).toBe("k_123");
    expect(headers["User-Agent"]).toMatch(/estate-sale-planner/);

    const respond = (status: number, body: unknown) => compsApiProvider("k", (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch);
    await expect(respond(429, { ok: false, error: "quota_reached" }).search("q", AbortSignal.timeout(1000))).rejects.toMatchObject({ kind: "quota" });
    await expect(respond(401, { ok: false, error: "Missing or invalid API key." }).search("q", AbortSignal.timeout(1000))).rejects.toMatchObject({ kind: "error" });
    const timeout = compsApiProvider("k", (async () => {
      throw Object.assign(new Error("t"), { name: "TimeoutError" });
    }) as unknown as typeof fetch);
    await expect(timeout.search("q", AbortSignal.timeout(1000))).rejects.toEqual(new ProviderError("error", "timeout"));
  });

  it("is off with no key, and on with one", () => {
    expect(providerFromEnv({})).toBeNull();
    expect(providerFromEnv({ COMPS_API_KEY: "k" })?.name).toBe("compsapi");
    expect(providerFromEnv({ COMPS_API_KEY: "k", COMPS_PROVIDER: "nope" })).toBeNull();
  });
});

describe("freshness", () => {
  it("reuses saved listings for 90 days", () => {
    const now = new Date("2026-11-02T00:00:00Z");
    expect(isFresh("2026-08-05T00:00:00Z", now)).toBe(true);
    expect(isFresh("2026-08-03T00:00:00Z", now)).toBe(false);
    expect(isFresh("not a date", now)).toBe(false);
  });
});

describe("cleanQuery — what's safe to send", () => {
  it("takes out words that describe what we don't know, or that sellers don't search by", () => {
    expect(cleanQuery("Unknown Maker tambour roll-top secretary desk")).toBe("tambour roll top secretary desk");
    expect(cleanQuery("unbranded unmarked teak desk")).toBe("teak desk");
    expect(cleanQuery("Signed Danish-style teak desk")).toBe("Danish teak desk");
    expect(cleanQuery("maker unknown brass lamp")).toBe("brass lamp");
    expect(cleanQuery("no-name generic lamp")).toBe("lamp");
  });

  it("keeps what identifies the object", () => {
    expect(cleanQuery("Lodge No. 8 skillet")).toBe("Lodge No. 8 skillet");
    expect(cleanQuery("set of 6 Pyrex mixing bowls")).toBe("set of 6 Pyrex mixing bowls");
    expect(cleanQuery("Le Creuset 26 dutch oven")).toBe("Le Creuset 26 dutch oven");
    expect(cleanQuery("Signet ring")).toBe("Signet ring");
    expect(cleanQuery("Hi-Fi receiver")).toBe("Hi Fi receiver");
  });

  it("takes out quotes and extra space, and caps the length", () => {
    expect(cleanQuery('  "teak"   desk ')).toBe("teak desk");
    expect(cleanQuery("one two three four five six seven eight")).toBe("one two three four five six");
  });

  it("can come back empty, for the caller to skip", () => {
    expect(cleanQuery("Unknown maker")).toBe("");
  });
});

describe("the provider's limits", () => {
  it("asks for a year of sales", () => {
    expect(new URL(compsApiUrl("q")).searchParams.get("days")).toBe("365");
  });

  it("treats a burst as an error to retry, and only a spent plan as quota", async () => {
    const respond = (status: number, body: unknown) => compsApiProvider("k", vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch);
    await expect(respond(429, { ok: false, error: "rate_limited" }).search("q", AbortSignal.timeout(1000))).rejects.toMatchObject({ kind: "error" });
    await expect(respond(429, { ok: false, error: "quota_reached" }).search("q", AbortSignal.timeout(1000))).rejects.toMatchObject({ kind: "quota" });
  });
});

describe("the prompts", () => {
  it("asks for a narrow search and broader ones, in sellers' words", () => {
    expect(QUERY_PROMPT).toMatch(/broader/);
    expect(QUERY_PROMPT).toMatch(/No\. 8/);
    expect(QUERY_PROMPT).toMatch(/Never write .*unknown/i);
  });

  it("lets an object with no known maker match comparable pieces, but not different objects", () => {
    expect(READ_PROMPT).toMatch(/no known maker/i);
    expect(READ_PROMPT).toMatch(/closest match first/i);
    // A reason read "Kept 3" when it kept one listing, numbered 3.
    expect(READ_PROMPT).toMatch(/never mention .*number/i);
    expect(READ_PROMPT).toMatch(/a No\. 8 skillet is not an 8-inch skillet/);
  });
});
