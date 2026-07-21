import { describe, it, expect } from "vitest";
import {
  formatMonthYear,
  mapHistoryPage,
  selectApprovedEntries,
} from "@/lib/notion-history";

// ---------------------------------------------------------------------------
// Fixtures — shape mirrors Notion data-source query results
// ---------------------------------------------------------------------------

const EXPERIMENT_ID = "exp-page-1";
const OTHER_ID = "exp-page-2";

function row(overrides: {
  milestone?: string;
  date?: string;
  approved?: boolean;
  experimentIds?: string[];
}) {
  return {
    id: `hist-${Math.random()}`,
    properties: {
      Milestone: {
        title:
          overrides.milestone === undefined
            ? [{ plain_text: "A milestone" }]
            : [{ plain_text: overrides.milestone }],
      },
      Date: {
        date:
          overrides.date === undefined
            ? { start: "2026-01-01" }
            : overrides.date
              ? { start: overrides.date }
              : null,
      },
      Approved: { checkbox: overrides.approved ?? true },
      Experiment: {
        relation: (overrides.experimentIds ?? [EXPERIMENT_ID]).map((id) => ({
          id,
        })),
      },
    },
  };
}

// ---------------------------------------------------------------------------
// formatMonthYear
// ---------------------------------------------------------------------------

describe("formatMonthYear", () => {
  it("formats an ISO date as month-level, dropping the day", () => {
    expect(formatMonthYear("2026-03-14")).toBe("Mar 2026");
    expect(formatMonthYear("2026-12-01")).toBe("Dec 2026");
  });

  it("is timezone-agnostic — a first-of-month date keeps its month", () => {
    // Parsing "2026-03-01" via new Date() then reading local month can slip to
    // February in negative-offset zones; the string parse must not.
    expect(formatMonthYear("2026-03-01")).toBe("Mar 2026");
  });

  it("returns null for missing or unparseable dates", () => {
    expect(formatMonthYear("")).toBeNull();
    expect(formatMonthYear(undefined)).toBeNull();
    expect(formatMonthYear(null)).toBeNull();
    expect(formatMonthYear("not-a-date")).toBeNull();
    expect(formatMonthYear("2026-13-01")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// mapHistoryPage
// ---------------------------------------------------------------------------

describe("mapHistoryPage", () => {
  it("flattens the properties this adapter needs", () => {
    const mapped = mapHistoryPage(
      row({
        milestone: "Launched the landing page",
        date: "2026-03-09",
        approved: true,
        experimentIds: [EXPERIMENT_ID],
      }),
    );
    expect(mapped).toEqual({
      milestone: "Launched the landing page",
      date: "2026-03-09",
      approved: true,
      experimentIds: [EXPERIMENT_ID],
    });
  });

  it("treats a missing/empty date and empty relation as blank, not a crash", () => {
    const mapped = mapHistoryPage({ id: "x", properties: {} });
    expect(mapped).toEqual({
      milestone: "",
      date: "",
      approved: false,
      experimentIds: [],
    });
  });
});

// ---------------------------------------------------------------------------
// selectApprovedEntries — the approval gate, sort, and skip rules
// ---------------------------------------------------------------------------

describe("selectApprovedEntries", () => {
  it("returns only approved entries for the given experiment", () => {
    const rows = [
      mapHistoryPage(row({ milestone: "Approved", approved: true })),
      mapHistoryPage(row({ milestone: "Draft", approved: false })),
    ];
    const entries = selectApprovedEntries(rows, EXPERIMENT_ID);
    expect(entries.map((e) => e.milestone)).toEqual(["Approved"]);
  });

  it("excludes entries belonging to a different experiment", () => {
    const rows = [
      mapHistoryPage(row({ milestone: "Mine", experimentIds: [EXPERIMENT_ID] })),
      mapHistoryPage(row({ milestone: "Theirs", experimentIds: [OTHER_ID] })),
    ];
    const entries = selectApprovedEntries(rows, EXPERIMENT_ID);
    expect(entries.map((e) => e.milestone)).toEqual(["Mine"]);
  });

  it("sorts ascending regardless of the order Notion returned", () => {
    const rows = [
      mapHistoryPage(row({ milestone: "April", date: "2026-04-20" })),
      mapHistoryPage(row({ milestone: "March", date: "2026-03-09" })),
      mapHistoryPage(row({ milestone: "July", date: "2026-07-20" })),
    ];
    const entries = selectApprovedEntries(rows, EXPERIMENT_ID);
    expect(entries.map((e) => e.milestone)).toEqual(["March", "April", "July"]);
    expect(entries.map((e) => e.month)).toEqual([
      "Mar 2026",
      "Apr 2026",
      "Jul 2026",
    ]);
  });

  it("skips entries with a missing or malformed date rather than rendering Invalid Date", () => {
    const rows = [
      mapHistoryPage(row({ milestone: "Good", date: "2026-03-09" })),
      mapHistoryPage(row({ milestone: "No date", date: "" })),
      mapHistoryPage(row({ milestone: "Bad date", date: "nonsense" })),
    ];
    const entries = selectApprovedEntries(rows, EXPERIMENT_ID);
    expect(entries.map((e) => e.milestone)).toEqual(["Good"]);
  });

  it("skips entries with an empty milestone", () => {
    const rows = [
      mapHistoryPage(row({ milestone: "", date: "2026-03-09" })),
      mapHistoryPage(row({ milestone: "Real", date: "2026-04-09" })),
    ];
    const entries = selectApprovedEntries(rows, EXPERIMENT_ID);
    expect(entries.map((e) => e.milestone)).toEqual(["Real"]);
  });

  it("returns an empty array when nothing qualifies", () => {
    expect(selectApprovedEntries([], EXPERIMENT_ID)).toEqual([]);
    const allDrafts = [
      mapHistoryPage(row({ milestone: "Draft", approved: false })),
    ];
    expect(selectApprovedEntries(allDrafts, EXPERIMENT_ID)).toEqual([]);
  });
});
