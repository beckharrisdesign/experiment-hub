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

    const [result] = await withTargeting([keywordRow({})]);
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
    const result = await withTargeting(rows);

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
    const [result] = await withTargeting([staleRow]);

    expect(result.targeting).toBeNull();
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
