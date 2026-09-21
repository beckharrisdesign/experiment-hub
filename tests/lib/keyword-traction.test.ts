import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { computeTargeting, toTableRows } from "@/lib/keyword-traction";
import type { RawListing } from "@/lib/etsy-scorecard";
import type { KeywordRow } from "@/types";

const { mockGetLatestListingSnapshots } = vi.hoisted(() => ({
  mockGetLatestListingSnapshots: vi.fn(),
}));

vi.mock("@/lib/etsy-sync", () => ({
  getLatestListingSnapshots: mockGetLatestListingSnapshots,
}));

function listing(
  id: number,
  tags: string[],
  state: string = "active",
): RawListing {
  return { listing_id: id, tags, state, title: `Listing ${id}` };
}

describe("computeTargeting", () => {
  it("reports the 1-based slot for a keyword tagged on one listing", () => {
    const result = computeTargeting(
      ["snow globe"],
      [listing(1, ["holiday", "snow globe", "gift"])],
    );
    expect(result.get("snow globe")).toEqual({
      best: 2,
      matches: [{ listingId: 1, slot: 2, title: "Listing 1" }],
    });
  });

  it("reports the earliest (lowest) slot across multiple listings", () => {
    const result = computeTargeting(
      ["snow globe"],
      [
        listing(1, ["holiday", "snow globe"]),
        listing(2, ["snow globe", "winter", "gift"]),
      ],
    );
    const match = result.get("snow globe")!;
    expect(match.best).toBe(1);
    expect(match.matches.map((m) => m.slot).sort()).toEqual([1, 2]);
  });

  it("does not add an entry for a keyword absent from every listing's tags", () => {
    const result = computeTargeting(
      ["never tagged"],
      [listing(1, ["holiday", "gift"])],
    );
    expect(result.has("never tagged")).toBe(false);
  });

  it("matches case-insensitively, exact text only", () => {
    const result = computeTargeting(
      ["Snow Globe"],
      [listing(1, ["snow globe"])],
    );
    expect(result.get("Snow Globe")?.best).toBe(1);
  });

  it("does not substring-match a tag", () => {
    const result = computeTargeting(
      ["snow globe"],
      [listing(1, ["snow globe ornament"])],
    );
    expect(result.has("snow globe")).toBe(false);
  });

  it("ignores a listing with no tags", () => {
    const result = computeTargeting(
      ["snow globe"],
      [
        { listing_id: 1, tags: null, state: "active", title: "Listing 1" },
        { listing_id: 2, tags: undefined, state: "active", title: "Listing 2" },
      ],
    );
    expect(result.size).toBe(0);
  });

  it("ignores a tag on a listing that is no longer active", () => {
    // computeTargeting's own guard, separate from getLatestListingSnapshots()
    // narrowing to the latest capture (lib/etsy-sync.ts): a listing can be
    // present in that latest capture and still not be a live, sellable
    // listing — draft, inactive, expired. Only state === "active" counts.
    const result = computeTargeting(
      ["snow globe"],
      [listing(1, ["snow globe"], "inactive")],
    );
    expect(result.has("snow globe")).toBe(false);
  });

  it("still matches when at least one of several listings is active", () => {
    const result = computeTargeting(
      ["snow globe"],
      [
        listing(1, ["snow globe"], "expired"),
        listing(2, ["snow globe"], "active"),
      ],
    );
    expect(result.get("snow globe")).toEqual({
      best: 1,
      matches: [{ listingId: 2, slot: 1, title: "Listing 2" }],
    });
  });
});

function keywordRow(overrides: Partial<KeywordRow>): KeywordRow {
  return {
    keyword: "snow globe",
    erank: {
      searches: 210,
      searchesCensored: false,
      competition: 180,
      kd: 22,
      avgClicks: null,
      avgClicksCensored: false,
      avgCtr: null,
      avgCtrCensored: false,
      googleSearches: null,
      tagOccurrences: null,
      foundVia: [],
      reportedBy: ["KT"],
      history: null,
      historyCapture: null,
    },
    keywordTool: {
      searches: 210,
      competition: 180,
      kd: 22,
      foundVia: [],
      coverage: { seen: 1, of: 1 },
      capture: "2026-09-17",
      current: true,
      supersededBy: null,
      history: [],
    },
    bulkKeywords: null,
    tagReport: null,
    shopSearch: null,
    ads: null,
    ranked: null,
    targeting: null,
    ...overrides,
  };
}

describe("withTargeting", () => {
  beforeEach(() => {
    // Repo convention (rules/vitest-conventions.mdc): reset mocks in
    // beforeEach via vi.clearAllMocks(), not a one-off mockReset() on a
    // single mock — so any mock added to this module later can't leak call
    // history between tests either.
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  // clearAllMocks() above only clears call history, not the mocked
  // implementation — the console.error spy would stay installed (still
  // silencing real errors) after this describe block finishes without this
  // separate restoreAllMocks() call.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("merges a real Targeting match onto the matching row", async () => {
    const { withTargeting } = await import("@/lib/keyword-traction");
    mockGetLatestListingSnapshots.mockResolvedValue([
      { listing_id: 1, tags: ["snow globe"], state: "active", title: "Listing 1" },
    ]);

    const { rows: out } = await withTargeting([keywordRow({})]);
    const [result] = out;
    expect(result.targeting).toEqual({
      best: 1,
      matches: [{ listingId: 1, slot: 1, title: "Listing 1" }],
    });
  });

  it("degrades to blank Targeting for every row when the Supabase read fails, without throwing", async () => {
    const { withTargeting } = await import("@/lib/keyword-traction");
    mockGetLatestListingSnapshots.mockRejectedValue(
      new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"),
    );

    const rows = [
      keywordRow({ keyword: "snow globe" }),
      keywordRow({ keyword: "gift" }),
    ];
    const { rows: result } = await withTargeting(rows);

    expect(result).toHaveLength(2);
    expect(result.every((r) => r.targeting === null)).toBe(true);
    expect(console.error).toHaveBeenCalled();
  });

  it("degrades to blank on failure even if the input rows already carried a real Targeting value", async () => {
    // Defensive, not reachable through today's single call site (the page
    // always passes freshly-loaded rows with targeting: null) — but
    // withTargeting is now an importable lib function, and its contract
    // must hold regardless of what a future caller passes in: a failed
    // read is never allowed to leave stale live data on the row.
    const { withTargeting } = await import("@/lib/keyword-traction");
    mockGetLatestListingSnapshots.mockRejectedValue(new Error("boom"));

    const staleRow = keywordRow({
      keyword: "snow globe",
      targeting: { best: 1, matches: [{ listingId: 1, slot: 1, title: "Listing 1" }] },
    });
    const { rows: out } = await withTargeting([staleRow]);

    expect(out[0].targeting).toBeNull();
  });
});

describe("toTableRows — listing sub-rows", () => {
  it("gives an ad-matched listing its own sub-row even when no tag carries the keyword", () => {
    const [row] = toTableRows([
      keywordRow({
        keyword: "embroidery pattern",
        targeting: {
          best: 4,
          matches: [{ listingId: 1, slot: 4, title: "Tagged listing" }],
        },
        ads: {
          views: 9,
          clicks: 0,
          clickRatePct: 0,
          spendUsd: 0,
          revenueUsd: 0,
          orders: 0,
          roas: 0,
          listingId: "2",
        },
      }),
    ]);

    // The union, not the intersection: listing 2 carries no such tag and is
    // still a row, which is the whole point (design.md Decision 14).
    expect(row.listings.map((l) => l.listingId)).toEqual(["1", "2"]);
    expect(row.listings[0].tagSlot).toBe(4);
    expect(row.listings[0].advertised).toBe(false);
    expect(row.listings[1].tagSlot).toBeNull();
    expect(row.listings[1].advertised).toBe(true);
    expect(row.listings[1].adViews).toBe(9);
  });

  it("falls back to the snapshot title for a listing no tag named", () => {
    // Without this an ad-matched listing renders as a bare id, which defeats
    // the one-listing-column decision.
    const [row] = toTableRows(
      [
        keywordRow({
          keyword: "embroidery pattern",
          ads: {
            views: 9,
            clicks: 0,
            clickRatePct: 0,
            spendUsd: 0,
            revenueUsd: 0,
            orders: 0,
            roas: 0,
            listingId: "2",
          },
        }),
      ],
      new Map([["2", "Digital leaf mandala embroidery pattern"]]),
    );

    expect(row.listings[0].title).toBe(
      "Digital leaf mandala embroidery pattern",
    );
  });

  it("decodes the HTML entities Etsy's API puts in listing titles", () => {
    // Etsy returns `6&quot; & 8&quot; hoops` for a title that reads
    // `6" & 8" hoops`. Keeping the entities would misrepresent the title,
    // not preserve it.
    const [row] = toTableRows(
      [
        keywordRow({
          keyword: "embroidery pattern",
          targeting: {
            best: 1,
            matches: [
              {
                listingId: 1,
                slot: 1,
                title: "Beginner design &#8212; 6&quot; &amp; 8&quot; hoops",
              },
            ],
          },
        }),
      ],
    );

    expect(row.listings[0].title).toBe(
      'Beginner design &#8212; 6" & 8" hoops',
    );
  });

  it("leaves a keyword with no related listing as a single row", () => {
    const [row] = toTableRows([keywordRow({})]);
    expect(row.listings).toEqual([]);
  });
});

describe("toTableRows", () => {
  it("collapses ranked and targeting to .best, dropping matches entirely", () => {
    const [result] = toTableRows([
      keywordRow({
        ranked: {
          best: 8,
          matches: [{ listing: "Listing A", page: 2, position: 8 }],
        },
        targeting: { best: 3, matches: [{ listingId: 1, slot: 3, title: "Listing 1" }] },
      }),
    ]);
    expect(result.ranked).toBe(8);
    expect(result.targeting).toBe(3);
    expect(result).not.toHaveProperty("ranked.matches");
    expect(result).not.toHaveProperty("targeting.matches");
  });

  it("passes null through as null, not 0", () => {
    const [result] = toTableRows([
      keywordRow({ ranked: null, targeting: null }),
    ]);
    expect(result.ranked).toBeNull();
    expect(result.targeting).toBeNull();
  });

  it("does not carry an unlisted field onto the public row, even if the input object has one", () => {
    // KeywordTableRow (types/index.ts) is an explicit field allowlist, not
    // Omit<KeywordRow, ...> — specifically so a future server-only KeywordRow
    // field can't reach this public, unauthenticated route just because
    // toTableRows() spread the whole row. Simulates that exact scenario: an
    // input row carrying a field KeywordTableRow was never told about.
    const rowWithExtra = {
      ...keywordRow({}),
      internalNote: "never meant for the browser",
    };
    const [result] = toTableRows([rowWithExtra]);
    expect(result).not.toHaveProperty("internalNote");
  });
});
