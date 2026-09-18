import { beforeAll, describe, it, expect } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import KeywordTable from "@/components/KeywordTable";
import type { KeywordTableRow } from "@/types";

// jsdom doesn't implement these, and Radix Select (under MVDS's `Select`)
// calls them when an option is chosen — without a stub, "Range filter
// column" can never be set via a click, and every test in this file would
// fail for a jsdom gap that has nothing to do with KeywordTable's own logic.
beforeAll(() => {
  Element.prototype.scrollIntoView ??= () => {};
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => {};
});

function row(overrides: Partial<KeywordTableRow>): KeywordTableRow {
  return {
    keyword: "keyword",
    capture: "2026-09-17",
    searches: 100,
    competition: 50,
    kd: 10,
    foundVia: [{ query: "test", tagOccurrences: 1 }],
    current: true,
    supersededBy: null,
    coverage: { seen: 1, of: 1 },
    ranked: null,
    targeting: null,
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
  }),
  row({
    keyword: "unrelated thing",
    searches: 5,
    competition: 0,
    kd: 0,
    ranked: 15,
    targeting: 8,
  }),
];

function bodyRows() {
  const body = screen.getAllByRole("rowgroup")[1];
  // queryAllByRole, not getAllByRole: the empty-result tests render a
  // genuinely empty <tbody>, where getAllByRole would throw instead of
  // returning [].
  return within(body).queryAllByRole("row");
}

function keywordOrder(): string[] {
  return bodyRows().map(
    (tr) => within(tr).getAllByRole("cell")[0].textContent ?? "",
  );
}

describe("KeywordTable — Ranked and Targeting columns", () => {
  it("renders numeric values, not badge text", () => {
    render(<KeywordTable rows={ROWS} />);
    const snowGlobeRow = bodyRows().find((tr) =>
      within(tr).queryByText("snow globe"),
    )!;
    const cells = within(snowGlobeRow).getAllByRole("cell");
    // Keyword, Searches, Competition, KD, Ranked, Targeting, Found via, Ratio
    expect(cells[4].textContent).toBe("8");
    expect(cells[5].textContent).toBe("3");
  });

  it("shows a blank dash, never 0, when there is no match", () => {
    render(<KeywordTable rows={ROWS} />);
    const fontRow = bodyRows().find((tr) =>
      within(tr).queryByText("embroidery font"),
    )!;
    const cells = within(fontRow).getAllByRole("cell");
    expect(cells[4].textContent).toBe("—");
    expect(cells[5].textContent).toBe("—");
  });

  it("has no Status, Capture or Coverage column", () => {
    // Case-insensitive: headers render title-case ("Status"), so an exact
    // uppercase match would pass even if the column were still there —
    // this has to catch the actual rendered text, not a string nothing
    // renders in the first place.
    render(<KeywordTable rows={ROWS} />);
    const headers = screen
      .getAllByRole("columnheader")
      .map((th) => th.textContent?.toLowerCase() ?? "");
    expect(headers.some((h) => h.includes("status"))).toBe(false);
    expect(headers.some((h) => h.includes("capture"))).toBe(false);
    expect(headers.some((h) => h.includes("coverage"))).toBe(false);
  });

  it("sorts blank Ranked rows after populated ones, in either direction", () => {
    render(<KeywordTable rows={ROWS} />);
    const header = screen.getByRole("button", { name: /Ranked/ });
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

  it("sorts blank Targeting rows after populated ones, in either direction", () => {
    // A separate code path from Ranked (its own sortKey branch and its own
    // rangeValue case) — asserted independently so a regression specific to
    // Targeting can't hide behind the Ranked test passing.
    render(<KeywordTable rows={ROWS} />);
    const header = screen.getByRole("button", { name: /Targeting/ });
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

/**
 * MVDS `Select` is Radix-based (`role="combobox"` trigger, portal-rendered
 * `role="option"` items), not a native `<select>` — `fireEvent.change` is a
 * no-op on it. Click-driven, matching how a person actually operates it.
 */
function chooseRangeColumn(label: string) {
  fireEvent.click(screen.getByLabelText("Range filter column"));
  fireEvent.click(screen.getByRole("option", { name: label }));
}

describe("KeywordTable — range filter", () => {
  it("clears the bound when the range column changes, rather than carrying it over", () => {
    // Bounds are per-column, not global state: switching from Ranked >= 8
    // straight to Targeting must not silently apply that same bound to a
    // column Katy never set a range on.
    render(<KeywordTable rows={ROWS} />);
    chooseRangeColumn("Ranked");
    fireEvent.change(screen.getByLabelText("Range filter minimum"), {
      target: { value: "8" },
    });
    expect(keywordOrder()).not.toContain("calm stitching"); // ranked 1, fails >= 8

    chooseRangeColumn("Targeting");
    expect(screen.getByLabelText("Range filter minimum")).toHaveValue(null);
    const visible = keywordOrder();
    // calm stitching has no Targeting value at all — if the stale >= 8 bound
    // carried over, it would stay excluded; with the bound properly cleared,
    // every row is visible again (no min/max set).
    expect(visible).toContain("calm stitching");
    expect(visible).toHaveLength(ROWS.length);
  });

  it("narrows to rows within a minimum bound on Ranked", () => {
    render(<KeywordTable rows={ROWS} />);
    chooseRangeColumn("Ranked");
    fireEvent.change(screen.getByLabelText("Range filter minimum"), {
      target: { value: "5" },
    });

    const visible = keywordOrder();
    expect(visible).toContain("snow globe"); // ranked 8, passes >= 5
    expect(visible).not.toContain("calm stitching"); // ranked 1, fails >= 5
    expect(visible).not.toContain("embroidery font"); // blank, excluded by a min bound
  });

  it("keeps blank rows when only a max bound is set", () => {
    render(<KeywordTable rows={ROWS} />);
    chooseRangeColumn("Ranked");
    fireEvent.change(screen.getByLabelText("Range filter maximum"), {
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
    chooseRangeColumn("Targeting");
    fireEvent.change(screen.getByLabelText("Range filter minimum"), {
      target: { value: "4" },
    });

    const visible = keywordOrder();
    expect(visible).toContain("wooden wick candle"); // targeting 5, passes >= 4
    expect(visible).not.toContain("snow globe"); // targeting 3, fails >= 4
    expect(visible).not.toContain("calm stitching"); // blank, excluded by a min bound
  });

  it("keeps blank rows when only a max bound is set on Targeting", () => {
    render(<KeywordTable rows={ROWS} />);
    chooseRangeColumn("Targeting");
    fireEvent.change(screen.getByLabelText("Range filter maximum"), {
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
    chooseRangeColumn("Searches");
    fireEvent.change(screen.getByLabelText("Range filter minimum"), {
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
    chooseRangeColumn("Competition");
    fireEvent.change(screen.getByLabelText("Range filter maximum"), {
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
    chooseRangeColumn("KD");
    fireEvent.change(screen.getByLabelText("Range filter minimum"), {
      target: { value: "20" },
    });

    const visible = keywordOrder();
    expect(visible).toContain("snow globe"); // kd 22, passes >= 20
    expect(visible).toContain("embroidery font"); // kd 61, passes >= 20
    expect(visible).not.toContain("calm stitching"); // kd 9, fails >= 20
    expect(visible).not.toContain("wooden wick candle"); // kd 11, fails >= 20
  });

  it("narrows on Searches / comp., excluding the null (zero-competition) row from a min bound", () => {
    render(<KeywordTable rows={ROWS} />);
    chooseRangeColumn("Searches / comp.");
    fireEvent.change(screen.getByLabelText("Range filter minimum"), {
      target: { value: "2" },
    });

    const visible = keywordOrder();
    expect(visible).toContain("calm stitching"); // 40/12 ≈ 3.33, passes >= 2
    expect(visible).toContain("wooden wick candle"); // 15/6 = 2.5, passes >= 2
    expect(visible).not.toContain("snow globe"); // 210/180 ≈ 1.17, fails >= 2
    expect(visible).not.toContain("unrelated thing"); // competition 0 -> ratio null, excluded by a min bound
  });

  it("explains a range-emptied result as the range's own doing, not the archive's", () => {
    // A zero-row range result is a direct, known consequence of the bound
    // Katy set — the generic "archive is hand-filtered" copy (which explains
    // a *keyword* filter turning up nothing) would misattribute the cause if
    // it showed here too.
    render(<KeywordTable rows={ROWS} />);
    chooseRangeColumn("Ranked");
    fireEvent.change(screen.getByLabelText("Range filter minimum"), {
      target: { value: "1000" },
    });

    expect(bodyRows()).toHaveLength(0);
    expect(
      screen.getByText(/no rows fall within this range/i),
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
    chooseRangeColumn("Ranked");
    fireEvent.change(screen.getByLabelText("Filter keywords"), {
      target: { value: "no such keyword anywhere" },
    });

    expect(bodyRows()).toHaveLength(0);
    expect(screen.getByText(/hand-filtered at/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/no rows fall within this range/i),
    ).not.toBeInTheDocument();
  });
});
