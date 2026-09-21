import { beforeAll, describe, it, expect } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import KeywordTable from "@/components/KeywordTable";
import type { KeywordTableRow } from "@/types";

// jsdom doesn't implement these, and Radix Select (under MVDS's `Select`)
// calls them when an option is chosen — without a stub, a filter can never
// be added via a click, and every test in this file would fail for a jsdom
// gap that has nothing to do with KeywordTable's own logic.
//
// `scrollTo` is the jump-to-band control's. Whether jsdom provides it varies
// by version: it exists locally and does not in CI, which is exactly the
// shape of bug that passes on a laptop and fails on a runner. Stubbed here
// rather than guarded in the component, because a real browser always has it
// and a defensive `typeof` check in product code would hide a genuine
// failure to scroll.
beforeAll(() => {
  Element.prototype.scrollIntoView ??= () => {};
  Element.prototype.scrollTo ??= () => {};
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => {};
});

/**
 * Flat spec for a row, expanded into the merged shape below.
 *
 * Kept flat on purpose: every Keyword Tool field a test cares about stays
 * one key deep, so a fixture reads as the row a person would see rather than
 * as the sub-object nesting the corpus happens to use. `noKeywordTool` builds
 * the case the merge introduced — a keyword no eRank Keyword Tool export ever
 * scored, which before this change could not exist as a row at all.
 */
interface RowSpec {
  keyword?: string;
  capture?: string | null;
  searches?: number | null;
  searchesCensored?: boolean;
  competition?: number | null;
  kd?: number | null;
  avgClicks?: number | null;
  avgClicksCensored?: boolean;
  avgCtr?: number | null;
  avgCtrCensored?: boolean;
  googleSearches?: number | null;
  tagOccurrences?: number | null;
  foundVia?: { query: string; tagOccurrences: number }[];
  reportedBy?: string[];
  ranked?: number | null;
  targeting?: number | null;
  shopSearch?: KeywordTableRow["shopSearch"];
  ads?: KeywordTableRow["ads"];
  listings?: KeywordTableRow["listings"];
  /** A keyword no eRank export ever scored — `erank` is null, not zeroed. */
  noErank?: boolean;
}

function row(overrides: RowSpec = {}): KeywordTableRow {
  return {
    keyword: overrides.keyword ?? "keyword",
    capture: overrides.capture !== undefined ? overrides.capture : "2026-09-17",
    erank: overrides.noErank
      ? null
      : {
          searches: overrides.searches !== undefined ? overrides.searches : 100,
          searchesCensored: overrides.searchesCensored ?? false,
          competition:
            overrides.competition !== undefined ? overrides.competition : 50,
          kd: overrides.kd !== undefined ? overrides.kd : 10,
          avgClicks: overrides.avgClicks ?? null,
          avgClicksCensored: overrides.avgClicksCensored ?? false,
          avgCtr: overrides.avgCtr ?? null,
          avgCtrCensored: overrides.avgCtrCensored ?? false,
          googleSearches: overrides.googleSearches ?? null,
          tagOccurrences: overrides.tagOccurrences ?? null,
          foundVia: overrides.foundVia ?? [{ query: "test", tagOccurrences: 1 }],
          reportedBy: overrides.reportedBy ?? ["KT"],
        },
    shopSearch: overrides.shopSearch ?? null,
    ads: overrides.ads ?? null,
    ranked: overrides.ranked ?? null,
    targeting: overrides.targeting ?? null,
    listings: overrides.listings ?? [],
  };
}

/** N listing sub-rows, tagged at ascending slots. */
function listingsOfLength(n: number): KeywordTableRow["listings"] {
  return Array.from({ length: n }, (_, i) =>
    listingRow({
      listingId: String(i + 1),
      title: `Listing ${i + 1}`,
      tagSlot: i + 1,
    }),
  );
}

/** A listing sub-row with everything absent unless a test says otherwise. */
function listingRow(
  overrides: Partial<KeywordTableRow["listings"][number]> = {},
): KeywordTableRow["listings"][number] {
  return {
    listingId: "1",
    title: "A listing",
    tagSlot: null,
    advertised: false,
    visits: null,
    itemsSold: null,
    revenueUsd: null,
    adViews: null,
    adClicks: null,
    adClickRatePct: null,
    adSpendUsd: null,
    adRevenueUsd: null,
    adOrders: null,
    adRoas: null,
    ...overrides,
  };
}

// KeywordTable's props are already collapsed to the sort value (`.best`) —
// the full per-listing detail never reaches this client component. See
// lib/keyword-traction.ts::toTableRows and types/index.ts::KeywordTableRow.
//
// competition/kd vary per row (not just searches/ranked/targeting) so the
// range filter's Competition, KD and ratio branches — not just Ranked and
// Targeting — have real values to narrow on. "unrelated thing" has
// competition: 0 specifically to exercise the ratio column's null case.
const ROWS: KeywordTableRow[] = [
  row({
    keyword: "snow globe",
    searches: 210,
    competition: 180,
    kd: 22,
    ranked: 8,
    targeting: 3,
    listings: listingsOfLength(3)
  }),
  row({
    keyword: "calm stitching",
    searches: 40,
    competition: 12,
    kd: 9,
    ranked: 1,
    targeting: null,
  }),
  row({
    keyword: "embroidery font",
    searches: 1400,
    competition: 980,
    kd: 61,
    ranked: null,
    targeting: null,
  }),
  row({
    keyword: "wooden wick candle",
    searches: 15,
    competition: 6,
    kd: 11,
    ranked: null,
    targeting: 5,
    listings: listingsOfLength(5)
  }),
  row({
    keyword: "unrelated thing",
    searches: 5,
    competition: 0,
    kd: 0,
    ranked: 15,
    targeting: 8,
    listings: listingsOfLength(8)
  }),
];

function bodyRows() {
  const body = screen.getAllByRole("rowgroup")[1];
  // queryAllByRole, not getAllByRole: the empty-result tests render a
  // genuinely empty <tbody>, where getAllByRole would throw instead of
  // returning [].
  // Parent rows only. A keyword with related listings now renders sub-rows
  // beneath it (design.md Decision 14), and those carry no keyword of their
  // own — counting them as rows would make every ordering assertion read a
  // run of blanks.
  return within(body)
    .queryAllByRole("row")
    .filter((tr) => tr.getAttribute("data-row") !== "listing");
}

function keywordOrder(): string[] {
  return bodyRows().map(
    (tr) => within(tr).getAllByRole("cell")[0].textContent ?? "",
  );
}

/**
 * Column positions, mirroring `COLUMNS` in `components/KeywordTable.tsx`.
 *
 * Named rather than inlined because the merge took the table from 8 columns
 * to 20: a bare `cells[4]` silently became a different column, and twelve
 * tests failed for one reason. The guard test below asserts these positions
 * still hold, so a future column change breaks in one obvious place instead.
 */
const COL = {
  keyword: 0,
  searches: 1,
  competition: 2,
  kd: 3,
  ratio: 9,
  foundVia: 8,
  reportedBy: 10,
  listingsCount: 11,
  listingTitle: 12,
  listingTagSlot: 13,
  listingAdvertised: 14,
  ranked: 15,
  shopVisits: 16,
  adsViews: 21,
} as const;

describe("KeywordTable — column layout", () => {
  it("keeps the column positions the other tests index by", () => {
    render(<KeywordTable rows={ROWS} />);
    // Third header row: bucket tier, then source bands, then columns.
    const headerRow = screen.getAllByRole("row")[2];
    const headers = within(headerRow)
      .getAllByRole("columnheader")
      .map((th) => th.textContent?.replace(/[↑↓↕]/g, "").trim() ?? "");
    // 33 columns became 28: eRank's 17 collapse to 10, Targeting gains the
    // listing columns, and Shop loses its duplicate Listing column.
    expect(headers).toHaveLength(28);
    expect(headers[COL.keyword]).toBe("Keyword");
    expect(headers[COL.searches]).toBe("Search Volume");
    expect(headers[COL.competition]).toBe("Etsy Competition");
    expect(headers[COL.kd]).toBe("KD");
    expect(headers[COL.foundVia]).toBe("Found via");
    expect(headers[COL.ratio]).toBe("Search / Competition");
    expect(headers[COL.reportedBy]).toBe("Reported by");
    expect(headers[COL.listingsCount]).toBe("Listings");
    expect(headers[COL.listingTitle]).toBe("Listing");
    expect(headers[COL.ranked]).toBe("Etsy SEO");
    // Only one column is ever named "Listing" (design.md Decision 15).
    expect(headers.filter((h) => h === "Listing")).toHaveLength(1);
  });

  it("groups the bands under Observed, Targeted and Performance", () => {
    render(<KeywordTable rows={ROWS} />);
    const bucketRow = screen.getAllByRole("row")[0];
    const buckets = within(bucketRow)
      .getAllByRole("columnheader")
      .map((th) => th.textContent?.trim() ?? "");
    expect(buckets).toContain("Observed");
    expect(buckets).toContain("Targeted");
    expect(buckets).toContain("Performance");
  });

  it("names every source in a band above its own columns", () => {
    render(<KeywordTable rows={ROWS} />);
    const bandRow = screen.getAllByRole("row")[1];
    const bands = within(bandRow)
      .getAllByRole("columnheader")
      .map((th) => th.textContent?.trim() ?? "");
    // The three eRank bands are one; the Ads band no longer claims the shop
    // targeted the keyword, because Etsy picks the search terms.
    expect(bands).toContain("eRank");
    expect(bands).not.toContain("eRank Keyword Tool");
    expect(bands).not.toContain("eRank Bulk Keywords");
    expect(bands).not.toContain("eRank Tag Report");
    expect(bands.some((b) => b.includes("matched by Etsy"))).toBe(true);
  });
});

describe("KeywordTable — Ranked and Targeting columns", () => {
  it("renders numeric values, not badge text", () => {
    render(<KeywordTable rows={ROWS} />);
    const snowGlobeRow = bodyRows().find((tr) =>
      within(tr).queryByText("snow globe"),
    )!;
    const cells = within(snowGlobeRow).getAllByRole("cell");
    expect(cells[COL.ranked].textContent).toBe("8");
    // The Targeting column is now the listing COUNT; the tag slot moved onto
    // each listing's own sub-row (design.md Decision 13).
    expect(cells[COL.listingsCount].textContent).toBe("3");
  });

  it("shows a blank dash, never 0, when there is no match", () => {
    render(<KeywordTable rows={ROWS} />);
    const fontRow = bodyRows().find((tr) =>
      within(tr).queryByText("embroidery font"),
    )!;
    const cells = within(fontRow).getAllByRole("cell");
    expect(cells[COL.ranked].textContent).toBe("—");
    expect(cells[COL.listingsCount].textContent).toBe("—");
  });

  it("has no Status, Capture or Coverage column", () => {
    // Case-insensitive: headers render title-case ("Status"), so an exact
    // uppercase match would pass even if the column were still there —
    // this has to catch the actual rendered text, not a string nothing
    // renders in the first place.
    //
    // Scoped to the COLUMN header row, not every columnheader on the table.
    // The band row is also made of columnheaders, and the Shop band is
    // legitimately labelled "Shop — captured" — matching that would fail a
    // test that means "no column named Capture", which is a different claim.
    render(<KeywordTable rows={ROWS} />);
    const headerRow = screen.getAllByRole("row")[2];
    const headers = within(headerRow)
      .getAllByRole("columnheader")
      .map((th) => th.textContent?.toLowerCase() ?? "");
    expect(headers.some((h) => h.includes("status"))).toBe(false);
    expect(headers.some((h) => h.includes("capture"))).toBe(false);
    expect(headers.some((h) => h.includes("coverage"))).toBe(false);
  });

  it("sorts blank Ranked rows after populated ones, in either direction", () => {
    render(<KeywordTable rows={ROWS} />);
    const header = screen.getByRole("button", { name: /Etsy SEO/ });
    const blanks = new Set(["embroidery font", "wooden wick candle"]);

    fireEvent.click(header); // first click: desc
    expect(new Set(keywordOrder().slice(-2))).toEqual(blanks);
    // Populated values, not just blank placement: a comparator that sorted
    // numerically backwards would still pass a blanks-only assertion.
    expect(keywordOrder().slice(0, 3)).toEqual([
      "unrelated thing", // ranked 15
      "snow globe", // ranked 8
      "calm stitching", // ranked 1
    ]);

    fireEvent.click(header); // second click: asc
    expect(new Set(keywordOrder().slice(-2))).toEqual(blanks);
    expect(keywordOrder().slice(0, 3)).toEqual([
      "calm stitching", // ranked 1
      "snow globe", // ranked 8
      "unrelated thing", // ranked 15
    ]);
  });

  it("sorts blank Listings rows after populated ones, in either direction", () => {
    // A separate code path from Ranked (its own sortKey branch and its own
    // rangeValue case) — asserted independently so a regression specific to
    // the listing count can't hide behind the Ranked test passing.
    render(<KeywordTable rows={ROWS} />);
    const header = screen.getByRole("button", { name: /^Listings/ });
    const blanks = new Set(["calm stitching", "embroidery font"]);

    fireEvent.click(header); // first click: desc
    expect(new Set(keywordOrder().slice(-2))).toEqual(blanks);
    expect(keywordOrder().slice(0, 3)).toEqual([
      "unrelated thing", // targeting 8
      "wooden wick candle", // targeting 5
      "snow globe", // targeting 3
    ]);

    fireEvent.click(header); // second click: asc
    expect(new Set(keywordOrder().slice(-2))).toEqual(blanks);
    expect(keywordOrder().slice(0, 3)).toEqual([
      "snow globe", // targeting 3
      "wooden wick candle", // targeting 5
      "unrelated thing", // targeting 8
    ]);
  });
});

describe("KeywordTable — a ranked-only row (no Keyword Tool data)", () => {
  const RANKED_ONLY_ROWS: KeywordTableRow[] = [
    ...ROWS,
    row({
      keyword: "wall art print",
      // Since the merge this is the truer fixture: the row exists because
      // Ranked has the keyword, and the Keyword Tool sub-object is absent
      // rather than present-with-null-fields.
      noErank: true,
      capture: null,
      ranked: 4,
      targeting: null,
    }),
  ];

  it("shows a blank dash, never 0, for Searches, Competition and KD", () => {
    render(<KeywordTable rows={RANKED_ONLY_ROWS} />);
    const wallArtRow = bodyRows().find((tr) =>
      within(tr).queryByText("wall art print"),
    )!;
    const cells = within(wallArtRow).getAllByRole("cell");
    expect(cells[COL.searches].textContent).toBe("—");
    expect(cells[COL.competition].textContent).toBe("—");
    expect(cells[COL.kd].textContent).toBe("—");
    expect(cells[COL.ranked].textContent).toBe("4");
  });

  it("sorts a null Searches value after every real one, in either direction", () => {
    render(<KeywordTable rows={RANKED_ONLY_ROWS} />);
    // Not by accessible name: "Search Volume" and "Search / Competition" both
    // start with "Search", and the active column's own arrow glyph varies
    // with direction — a "/" is the one thing that tells them apart.
    const header = screen
      .getAllByRole("columnheader")
      .find(
        (th) =>
          th.textContent?.startsWith("Search") &&
          !th.textContent.includes("/"),
      )!
      .querySelector("button")!;

    // Searches is the default sort column (desc) — this is already sorted.
    expect(keywordOrder().at(-1)).toBe("wall art print");

    fireEvent.click(header); // asc
    expect(keywordOrder().at(-1)).toBe("wall art print");
  });

  it("excludes a null-Searches row from a min-bound range filter", () => {
    render(<KeywordTable rows={RANKED_ONLY_ROWS} />);
    chooseRangeColumn("eRank — Search Volume");
    fireEvent.change(bound("eRank — Search Volume", "minimum"), {
      target: { value: "0" },
    });

    expect(keywordOrder()).not.toContain("wall art print");
  });
});

/**
 * MVDS `Select` is Radix-based (`role="combobox"` trigger, portal-rendered
 * `role="option"` items), not a native `<select>` — `fireEvent.change` is a
 * no-op on it. Click-driven, matching how a person actually operates it.
 */
/**
 * Picks a range column by its full option label.
 *
 * The picker is a flat list with no band above it, so each option spells out
 * its source: "eRank — KD". Call sites pass that whole string
 * rather than a bare "KD", because since the merge three different columns
 * are named KD and a bare label matches all three.
 */
/**
 * Adds a range filter for a column, by its full option label.
 *
 * Filters compound now: each one appends its own removable chip carrying its
 * own min/max inputs, labelled with the column's qualified name. There is no
 * longer a single shared "Range filter minimum" — that was the control that
 * could only hold one filter at a time.
 */
function chooseRangeColumn(label: string) {
  fireEvent.click(screen.getByLabelText("Add range filter"));
  fireEvent.click(screen.getByRole("option", { name: label }));
}

/** The min/max inputs belonging to one active filter chip. */
function bound(label: string, which: "minimum" | "maximum") {
  return screen.getByLabelText(`${label} ${which}`);
}

/** Active filter labels, in the order their chips render. */
function activeFilters(): string[] {
  return screen
    .getAllByRole("button", { name: /^Remove .* filter$/ })
    .map((b) => (b.getAttribute("aria-label") ?? "").replace(/^Remove | filter$/g, ""));
}

describe("KeywordTable — range filter", () => {
  it("keeps each filter's bound when another is added, rather than resetting it", () => {
    // The inverse of the old single-filter contract. Bounds used to be global
    // state, so picking a second column had to clear the first or it would
    // silently apply a bound Katy never set there. Filters compound now:
    // each carries its own bound and adding one must leave the other alone.
    render(<KeywordTable rows={ROWS} />);
    chooseRangeColumn("Ranked — Etsy SEO");
    fireEvent.change(bound("Ranked — Etsy SEO", "minimum"), {
      target: { value: "8" },
    });

    chooseRangeColumn("Targeting — Listings");

    expect(bound("Ranked — Etsy SEO", "minimum")).toHaveValue(8);
    expect(bound("Targeting — Listings", "minimum")).toHaveValue(null);
    expect(activeFilters()).toEqual([
      "Ranked — Etsy SEO",
      "Targeting — Listings",
    ]);
  });

  it("removes one filter without disturbing the other", () => {
    render(<KeywordTable rows={ROWS} />);
    chooseRangeColumn("Ranked — Etsy SEO");
    chooseRangeColumn("Targeting — Listings");
    fireEvent.change(bound("Targeting — Listings", "minimum"), {
      target: { value: "3" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Remove Ranked — Etsy SEO filter" }),
    );

    expect(activeFilters()).toEqual(["Targeting — Listings"]);
    expect(bound("Targeting — Listings", "minimum")).toHaveValue(3);
  });

  it("narrows to rows within a minimum bound on Ranked", () => {
    render(<KeywordTable rows={ROWS} />);
    chooseRangeColumn("Ranked — Etsy SEO");
    fireEvent.change(bound("Ranked — Etsy SEO", "minimum"), {
      target: { value: "5" },
    });

    const visible = keywordOrder();
    expect(visible).toContain("snow globe"); // ranked 8, passes >= 5
    expect(visible).not.toContain("calm stitching"); // ranked 1, fails >= 5
    expect(visible).not.toContain("embroidery font"); // blank, excluded by a min bound
  });

  it("keeps blank rows when only a max bound is set", () => {
    render(<KeywordTable rows={ROWS} />);
    chooseRangeColumn("Ranked — Etsy SEO");
    fireEvent.change(bound("Ranked — Etsy SEO", "maximum"), {
      target: { value: "5" },
    });

    const visible = keywordOrder();
    expect(visible).toContain("calm stitching"); // ranked 1, passes <= 5
    expect(visible).not.toContain("snow globe"); // ranked 8, fails <= 5
    expect(visible).toContain("embroidery font"); // blank, not excluded by a max-only bound
  });

  it("narrows to rows within a minimum bound on Targeting", () => {
    // Own describe-level case, not just Ranked — the range picker has a
    // separate Targeting branch in rangeValue().
    render(<KeywordTable rows={ROWS} />);
    chooseRangeColumn("Targeting — Listings");
    fireEvent.change(bound("Targeting — Listings", "minimum"), {
      target: { value: "4" },
    });

    const visible = keywordOrder();
    expect(visible).toContain("wooden wick candle"); // targeting 5, passes >= 4
    expect(visible).not.toContain("snow globe"); // targeting 3, fails >= 4
    expect(visible).not.toContain("calm stitching"); // blank, excluded by a min bound
  });

  it("keeps blank rows when only a max bound is set on Targeting", () => {
    render(<KeywordTable rows={ROWS} />);
    chooseRangeColumn("Targeting — Listings");
    fireEvent.change(bound("Targeting — Listings", "maximum"), {
      target: { value: "4" },
    });

    const visible = keywordOrder();
    expect(visible).toContain("snow globe"); // targeting 3, passes <= 4
    expect(visible).not.toContain("wooden wick candle"); // targeting 5, fails <= 4
    expect(visible).toContain("calm stitching"); // blank, not excluded by a max-only bound
  });

  // Representative coverage for the remaining numeric columns — Searches,
  // Competition, KD and the fractional ratio — each a separate rangeValue()
  // branch that could regress independently of Ranked/Targeting above.
  it("narrows on Searches", () => {
    render(<KeywordTable rows={ROWS} />);
    chooseRangeColumn("eRank — Search Volume");
    fireEvent.change(bound("eRank — Search Volume", "minimum"), {
      target: { value: "100" },
    });

    const visible = keywordOrder();
    expect(visible).toContain("snow globe"); // 210, passes >= 100
    expect(visible).toContain("embroidery font"); // 1400, passes >= 100
    expect(visible).not.toContain("calm stitching"); // 40, fails >= 100
    expect(visible).not.toContain("wooden wick candle"); // 15, fails >= 100
  });

  it("narrows on Competition", () => {
    render(<KeywordTable rows={ROWS} />);
    chooseRangeColumn("eRank — Etsy Competition");
    fireEvent.change(bound("eRank — Etsy Competition", "maximum"), {
      target: { value: "50" },
    });

    const visible = keywordOrder();
    expect(visible).toContain("calm stitching"); // 12, passes <= 50
    expect(visible).toContain("wooden wick candle"); // 6, passes <= 50
    expect(visible).not.toContain("snow globe"); // 180, fails <= 50
    expect(visible).not.toContain("embroidery font"); // 980, fails <= 50
  });

  it("narrows on KD", () => {
    render(<KeywordTable rows={ROWS} />);
    chooseRangeColumn("eRank — KD");
    fireEvent.change(bound("eRank — KD", "minimum"), {
      target: { value: "20" },
    });

    const visible = keywordOrder();
    expect(visible).toContain("snow globe"); // kd 22, passes >= 20
    expect(visible).toContain("embroidery font"); // kd 61, passes >= 20
    expect(visible).not.toContain("calm stitching"); // kd 9, fails >= 20
    expect(visible).not.toContain("wooden wick candle"); // kd 11, fails >= 20
  });

  it("narrows on Search / Competition, excluding the null (zero-competition) row from a min bound", () => {
    render(<KeywordTable rows={ROWS} />);
    chooseRangeColumn("eRank — Search / Competition");
    fireEvent.change(bound("eRank — Search / Competition", "minimum"), {
      target: { value: "2" },
    });

    const visible = keywordOrder();
    expect(visible).toContain("calm stitching"); // 40/12 ≈ 3.33, passes >= 2
    expect(visible).toContain("wooden wick candle"); // 15/6 = 2.5, passes >= 2
    expect(visible).not.toContain("snow globe"); // 210/180 ≈ 1.17, fails >= 2
    expect(visible).not.toContain("unrelated thing"); // competition 0 -> ratio null, excluded by a min bound
  });

  it("switches both range inputs to a decimal keypad for the fractional Search / Competition column", () => {
    // Every other range target is a whole number (numeric keypad, no decimal
    // separator on mobile) — only this column's bounds need inputMode
    // "decimal", and previously nothing asserted that either input actually
    // got it.
    render(<KeywordTable rows={ROWS} />);
    chooseRangeColumn("eRank — Search / Competition");

    expect(bound("eRank — Search / Competition", "minimum")).toHaveAttribute(
      "inputmode",
      "decimal",
    );
    expect(bound("eRank — Search / Competition", "maximum")).toHaveAttribute(
      "inputmode",
      "decimal",
    );
  });

  it("explains a range-emptied result as the range's own doing, not the archive's", () => {
    // A zero-row range result is a direct, known consequence of the bound
    // Katy set — the generic "archive is hand-filtered" copy (which explains
    // a *keyword* filter turning up nothing) would misattribute the cause if
    // it showed here too.
    render(<KeywordTable rows={ROWS} />);
    chooseRangeColumn("Ranked — Etsy SEO");
    fireEvent.change(bound("Ranked — Etsy SEO", "minimum"), {
      target: { value: "1000" },
    });

    expect(bodyRows()).toHaveLength(0);
    expect(
      screen.getByText(/no rows fall within these ranges/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/hand-filtered at/i)).not.toBeInTheDocument();
  });

  it("keeps the archive-omission copy when the emptied result has no active range filter", () => {
    render(<KeywordTable rows={ROWS} />);
    fireEvent.change(screen.getByLabelText("Filter keywords"), {
      target: { value: "no such keyword anywhere" },
    });

    expect(bodyRows()).toHaveLength(0);
    expect(screen.getByText(/hand-filtered at/i)).toBeInTheDocument();
  });

  it("keeps the archive-omission copy when a range column is picked but no bound is set", () => {
    // Picking a range column alone isn't an applied filter — passesRange
    // treats both-blank min/max as "no bound." A keyword filter emptying the
    // table here must not be blamed on the merely-selected range column.
    render(<KeywordTable rows={ROWS} />);
    chooseRangeColumn("Ranked — Etsy SEO");
    fireEvent.change(screen.getByLabelText("Filter keywords"), {
      target: { value: "no such keyword anywhere" },
    });

    expect(bodyRows()).toHaveLength(0);
    expect(screen.getByText(/hand-filtered at/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/no rows fall within these ranges/i),
    ).not.toBeInTheDocument();
  });

  it("keeps the archive-omission copy when an unrelated filter empties rows the range bound itself would have kept", () => {
    // A real bound is set (min 5 on Ranked, which alone would still match
    // "snow globe" and "unrelated thing") — but the keyword filter excludes
    // everything first, so the range filter never had any rows to exclude in
    // the first place. Blaming the range here would be misleading in the
    // opposite direction from the round-8/9 fixes: not "no bound was ever
    // set," but "the bound was never actually the reason."
    render(<KeywordTable rows={ROWS} />);
    chooseRangeColumn("Ranked — Etsy SEO");
    fireEvent.change(bound("Ranked — Etsy SEO", "minimum"), {
      target: { value: "5" },
    });
    expect(keywordOrder()).toContain("snow globe"); // sanity: the bound alone doesn't empty the table

    fireEvent.change(screen.getByLabelText("Filter keywords"), {
      target: { value: "no such keyword anywhere" },
    });

    expect(bodyRows()).toHaveLength(0);
    expect(screen.getByText(/hand-filtered at/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/no rows fall within these ranges/i),
    ).not.toBeInTheDocument();
  });
});

describe("KeywordTable — captured demand bands", () => {
  const CAPTURED: KeywordTableRow[] = [
    row({
      keyword: "paper embriodery template",
      noErank: true,
      capture: null,
      shopSearch: {
        visits: 1,
        etsyVisits: null,
        googleVisits: null,
        listingId: "4466076995",
        listingTitle: "Digital geometric embroidery pattern",
        listingVisits: 14,
        listingItemsSold: 1,
        listingRevenueUsd: 6,
      },
    }),
    row({
      keyword: "geometric embroidery pattern",
      noErank: true,
      capture: null,
      ads: {
        views: 5,
        clicks: 0,
        clickRatePct: 0,
        spendUsd: 0,
        revenueUsd: 0,
        orders: 0,
        roas: 0,
        listingId: "4466080258",
      },
    }),
  ];

  it("renders Shop and Etsy Ads as separate bands, each stating its own window", () => {
    render(<KeywordTable rows={CAPTURED} />);
    const bandRow = screen.getAllByRole("row")[1];
    const bands = within(bandRow)
      .getAllByRole("columnheader")
      .map((th) => th.textContent ?? "");
    expect(bands.some((b) => b.includes("Shop") && b.includes("this year"))).toBe(
      true,
    );
    expect(
      bands.some((b) => b.includes("Etsy Ads") && b.includes("last 30 days")),
    ).toBe(true);
  });

  it("never sums views into visits", () => {
    // The two measure different things — impressions vs arrivals — so no cell
    // may show their total. The ads-only row must read blank under Shop.
    render(<KeywordTable rows={CAPTURED} />);
    const adsRow = bodyRows().find((tr) =>
      within(tr).queryByText("geometric embroidery pattern"),
    )!;
    const cells = within(adsRow).getAllByRole("cell");
    expect(cells[COL.shopVisits].textContent).toBe("—");
    expect(cells[COL.adsViews].textContent).toBe("5");
  });

  it("keeps a captured term's misspelling exactly as typed", () => {
    render(<KeywordTable rows={CAPTURED} />);
    expect(screen.getByText("paper embriodery template")).toBeInTheDocument();
    expect(screen.queryByText("paper embroidery template")).toBeNull();
  });
});

describe("KeywordTable — compound filtering and sorting", () => {
  it("narrows by several filters at once", () => {
    render(<KeywordTable rows={ROWS} />);
    const before = bodyRows().length;

    chooseRangeColumn("eRank — Search Volume");
    fireEvent.change(bound("eRank — Search Volume", "minimum"), {
      target: { value: "10" },
    });
    const afterFirst = bodyRows().length;

    chooseRangeColumn("Ranked — Etsy SEO");
    fireEvent.change(bound("Ranked — Etsy SEO", "maximum"), {
      target: { value: "10" },
    });
    const afterSecond = bodyRows().length;

    expect(afterFirst).toBeLessThan(before);
    expect(afterSecond).toBeLessThanOrEqual(afterFirst);
    // Both remain applied and individually visible.
    expect(activeFilters()).toHaveLength(2);
  });

  it("breaks ties on a second sort key", () => {
    // Every row here shares a KD of 50, so the first key cannot order them;
    // only the second can. Without a second key the order falls back to
    // keyword, which is a different result.
    const TIED: KeywordTableRow[] = [
      row({ keyword: "alpha", kd: 50, searches: 10 }),
      row({ keyword: "bravo", kd: 50, searches: 30 }),
      row({ keyword: "charlie", kd: 50, searches: 20 }),
    ];
    render(<KeywordTable rows={TIED} />);

    // The table already sorts by Searches descending. Clicking KD makes KD
    // primary and demotes Searches to the tie-breaker — so with every KD
    // tied at 50, the order is Searches descending: 30, 20, 10.
    //
    // KD is scoped by column position rather than by name. Before the merge
    // three columns were called KD — one per eRank export — which is what
    // made bands necessary; now there is one, and position still reads
    // clearest against the COL map the other tests share.
    const headerRow = screen.getAllByRole("row")[2];
    const headers = within(headerRow).getAllByRole("columnheader");
    fireEvent.click(within(headers[COL.kd]).getByRole("button"));

    expect(keywordOrder()).toEqual(["bravo", "charlie", "alpha"]);
  });
});

describe("KeywordTable — export", () => {
  function captureExport(rows: KeywordTableRow[]): string {
    let captured = "";
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    // jsdom has no Blob.text() synchronously, so read what was constructed.
    const OriginalBlob = globalThis.Blob;
    class CapturingBlob extends OriginalBlob {
      constructor(parts: BlobPart[], options?: BlobPropertyBag) {
        captured = String(parts[0]);
        super(parts, options);
      }
    }
    globalThis.Blob = CapturingBlob as unknown as typeof Blob;
    URL.createObjectURL = () => "blob:mock";
    URL.revokeObjectURL = () => {};
    try {
      render(<KeywordTable rows={rows} />);
      fireEvent.click(screen.getByRole("button", { name: /Export CSV/ }));
    } finally {
      globalThis.Blob = OriginalBlob;
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
    }
    return captured;
  }

  it("writes every column of the visible rows", () => {
    const csv = captureExport(ROWS);
    const [header, ...body] = csv.split("\n");
    expect(header.split('","')).toHaveLength(28);
    expect(body).toHaveLength(ROWS.length);
    expect(header).toContain("Keyword");
    expect(header).toContain("Etsy Ads — matched by Etsy — Views");
  });

  it("carries blanks and misspellings through verbatim, never a fabricated zero", () => {
    const csv = captureExport([
      row({
        keyword: "paper embriodery template",
        noErank: true,
        capture: null,
        shopSearch: {
          visits: 1,
          etsyVisits: null,
          googleVisits: null,
          listingId: "1",
          listingTitle: "A listing",
          listingVisits: 1,
          listingItemsSold: 0,
          listingRevenueUsd: 0,
        },
      }),
    ]);
    const dataRow = csv.split("\n")[1];
    expect(dataRow).toContain("paper embriodery template");
    expect(dataRow).not.toContain("paper embroidery template");
    // Absent Keyword Tool columns are em dashes, not zeros.
    expect(dataRow.startsWith('"paper embriodery template","—","—","—"')).toBe(
      true,
    );
  });
});

describe("KeywordTable — frozen column edge", () => {
  it("draws the edge with pseudo-elements, not a cell border", () => {
    // A regression guard, not proof it renders: jsdom does not compute
    // pseudo-element styles. What it does catch is the edge reverting to
    // `border-r` + `box-shadow`, which is what was there before and which
    // renders NOTHING under `border-collapse: collapse` — the styles compute
    // exactly as written and the browser paints neither.
    render(<KeywordTable rows={ROWS} />);
    fireEvent.click(screen.getByRole("button", { name: /Freeze keyword/ }));

    const firstCell = bodyRows()[0].querySelectorAll("td")[0];
    expect(firstCell.className).toContain("sticky");
    expect(firstCell.className).toContain("before:bg-accent-primary");
    expect(firstCell.className).not.toContain("border-r ");
  });
});

describe("KeywordTable — presence filters", () => {
  it("narrows to rows that have a value, and shows a removable chip", async () => {
    render(<KeywordTable rows={ROWS} />);
    fireEvent.click(screen.getByLabelText("Add presence filter"));
    fireEvent.click(
      await screen.findByRole("option", { name: "has Ranked — Etsy SEO" }),
    );

    // A filter the reader cannot see is a filter they cannot undo — the chip
    // is part of the feature, not decoration.
    expect(
      screen.getByRole("button", { name: /Remove has .* filter/ }),
    ).toBeInTheDocument();
    expect(keywordOrder()).not.toContain("embroidery font");
  });

  it("asks for absence as well as presence", async () => {
    render(<KeywordTable rows={ROWS} />);
    fireEvent.click(screen.getByLabelText("Add presence filter"));
    fireEvent.click(
      await screen.findByRole("option", { name: "no Ranked — Etsy SEO" }),
    );

    expect(keywordOrder()).toContain("embroidery font");
    expect(keywordOrder()).not.toContain("snow globe");
  });
});

describe("KeywordTable — scroll tools", () => {
  it("offers a jump control for every source band without hiding columns", () => {
    render(<KeywordTable rows={ROWS} />);
    const before = within(screen.getAllByRole("row")[2]).getAllByRole(
      "columnheader",
    ).length;
    fireEvent.click(screen.getByRole("button", { name: "Etsy Ads — matched by Etsy" }));
    const after = within(screen.getAllByRole("row")[2]).getAllByRole(
      "columnheader",
    ).length;
    expect(after).toBe(before);
    expect(after).toBe(28);
  });

  it("leaves the keyword unfrozen until asked", () => {
    render(<KeywordTable rows={ROWS} />);
    const toggle = screen.getByRole("button", { name: /Freeze keyword/ });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });
});
