import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the Notion client and the experiments adapter so the fetch/cache/env
// behavior can be exercised without a network. vi.hoisted keeps the handles
// available inside the hoisted vi.mock factories.
const { queryMock, pageIdMock, blocksMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  pageIdMock: vi.fn(),
  blocksMock: vi.fn(async () => ({ results: [], has_more: false })),
}));

vi.mock("@/lib/notion", () => ({
  getUncachableNotionClient: vi.fn(async () => ({
    dataSources: { query: queryMock },
    blocks: { children: { list: blocksMock } },
  })),
}));

vi.mock("@/lib/notion-experiments", () => ({
  getExperimentPageIdFromNotion: pageIdMock,
}));

import {
  formatMonthYear,
  formatDateSpan,
  mapBodyBlocks,
  mapHistoryPage,
  selectApprovedEntries,
  getHistoryForExperiment,
  clearNotionHistoryCache,
} from "@/lib/notion-history";

// ---------------------------------------------------------------------------
// Fixtures — shape mirrors Notion data-source query results
// ---------------------------------------------------------------------------

const EXPERIMENT_ID = "exp-page-1";
const OTHER_ID = "exp-page-2";

function row(overrides: {
  milestone?: string;
  date?: string;
  endDate?: string;
  approved?: boolean;
  experimentIds?: string[];
  receiptUrl?: string | null;
}) {
  return {
    id: `hist-${Math.random()}`,
    properties: {
      "Receipt URL": { url: overrides.receiptUrl ?? null },
      Milestone: {
        title:
          overrides.milestone === undefined
            ? [{ plain_text: "A milestone" }]
            : [{ plain_text: overrides.milestone }],
      },
      Date: {
        date:
          overrides.date === undefined
            ? { start: "2026-01-01", end: overrides.endDate ?? null }
            : overrides.date
              ? { start: overrides.date, end: overrides.endDate ?? null }
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
// formatDateSpan — ranges render at their natural grain (decided 2026-08-22)
// ---------------------------------------------------------------------------

describe("formatDateSpan", () => {
  it("renders month-wide with no end date — generator entries unchanged", () => {
    expect(formatDateSpan("2026-04-01", null)).toBe("Apr 2026");
    expect(formatDateSpan("2026-04-01", undefined)).toBe("Apr 2026");
  });

  it("renders a single day when end equals start", () => {
    expect(formatDateSpan("2026-03-09", "2026-03-09")).toBe("Mar 9, 2026");
  });

  it("renders a within-month span with both days", () => {
    expect(formatDateSpan("2026-03-10", "2026-03-30")).toBe("Mar 10–30, 2026");
  });

  it("renders a cross-month span within one year as months", () => {
    expect(formatDateSpan("2026-05-01", "2026-06-30")).toBe("May–Jun 2026");
  });

  it("renders a cross-year span with both years", () => {
    expect(formatDateSpan("2024-07-13", "2026-03-09")).toBe(
      "Jul 2024–Mar 2026",
    );
  });

  it("degrades an unparseable or out-of-order end to the start's month", () => {
    expect(formatDateSpan("2026-03-10", "nonsense")).toBe("Mar 2026");
    expect(formatDateSpan("2026-03-10", "2026-03-01")).toBe("Mar 2026");
  });

  it("returns null for a missing or unparseable start", () => {
    expect(formatDateSpan("", "2026-03-09")).toBeNull();
    expect(formatDateSpan(null, null)).toBeNull();
    expect(formatDateSpan("not-a-date", "2026-03-09")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// mapBodyBlocks — page-body paragraphs become attributed source lines
// ---------------------------------------------------------------------------

describe("mapBodyBlocks", () => {
  const rich = (text: string, opts: { bold?: boolean; code?: boolean; href?: string } = {}) => ({
    plain_text: text,
    annotations: { bold: opts.bold ?? false, code: opts.code ?? false },
    href: opts.href ?? null,
  });

  it("maps paragraph rich text with bold, code, and link annotations", () => {
    const lines = mapBodyBlocks([
      {
        type: "paragraph",
        paragraph: {
          rich_text: [
            rich("gh:", { bold: true }),
            rich(" a small server with "),
            rich("pdfGenerator.js", { code: true }),
            rich("commit", { href: "https://github.com/x" }),
          ],
        },
      },
    ]);
    expect(lines).toEqual([
      [
        { text: "gh:", bold: true, code: false, href: null },
        { text: " a small server with ", bold: false, code: false, href: null },
        { text: "pdfGenerator.js", bold: false, code: true, href: null },
        { text: "commit", bold: false, code: false, href: "https://github.com/x" },
      ],
    ]);
  });

  it("drops non-paragraph blocks and empty paragraphs", () => {
    const lines = mapBodyBlocks([
      { type: "heading_2", heading_2: { rich_text: [rich("Skip me")] } },
      { type: "paragraph", paragraph: { rich_text: [] } },
      { type: "paragraph", paragraph: { rich_text: [rich("Keep me")] } },
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0][0].text).toBe("Keep me");
  });

  it("returns [] for an empty body", () => {
    expect(mapBodyBlocks([])).toEqual([]);
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
        receiptUrl: "https://github.com/x/y/commit/abc123",
      }),
    );
    expect(mapped).toEqual({
      id: expect.any(String),
      milestone: "Launched the landing page",
      date: "2026-03-09",
      endDate: null,
      approved: true,
      experimentIds: [EXPERIMENT_ID],
      receiptUrl: "https://github.com/x/y/commit/abc123",
    });
  });

  it("treats a missing/empty date and empty relation as blank, not a crash", () => {
    const mapped = mapHistoryPage({ id: "x", properties: {} });
    expect(mapped).toEqual({
      id: "x",
      milestone: "",
      date: "",
      endDate: null,
      approved: false,
      experimentIds: [],
      receiptUrl: null,
    });
  });

  it("normalizes an empty-string Receipt URL to null", () => {
    expect(mapHistoryPage(row({ receiptUrl: "" })).receiptUrl).toBeNull();
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
    expect(entries.map((e) => e.when)).toEqual([
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

  it("carries the receipt URL through to the entry, null when unset", () => {
    const rows = [
      mapHistoryPage(
        row({
          milestone: "Linked",
          date: "2026-03-09",
          receiptUrl: "https://github.com/x/y/commit/abc123",
        }),
      ),
      mapHistoryPage(row({ milestone: "Unlinked", date: "2026-04-09" })),
    ];
    const entries = selectApprovedEntries(rows, EXPERIMENT_ID);
    expect(entries.map((e) => e.receiptUrl)).toEqual([
      "https://github.com/x/y/commit/abc123",
      null,
    ]);
  });

  it("returns an empty array when nothing qualifies", () => {
    expect(selectApprovedEntries([], EXPERIMENT_ID)).toEqual([]);
    const allDrafts = [
      mapHistoryPage(row({ milestone: "Draft", approved: false })),
    ];
    expect(selectApprovedEntries(allDrafts, EXPERIMENT_ID)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getHistoryForExperiment — fetch, pagination, cache, env gating
// ---------------------------------------------------------------------------

function queryPage(
  milestone: string,
  opts: { hasMore?: boolean; cursor?: string } = {},
) {
  return {
    results: [
      row({ milestone, date: "2026-03-09", experimentIds: [EXPERIMENT_ID] }),
    ],
    has_more: opts.hasMore ?? false,
    next_cursor: opts.cursor ?? null,
  };
}

describe("getHistoryForExperiment", () => {
  beforeEach(() => {
    vi.stubEnv("NOTION_HISTORY_DATA_SOURCE_ID", "hist-ds");
    vi.stubEnv("NOTION_EXPERIMENTS_DATA_SOURCE_ID", "exp-ds");
    clearNotionHistoryCache();
    pageIdMock.mockResolvedValue(EXPERIMENT_ID);
    queryMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("queries the configured history data source", async () => {
    queryMock.mockResolvedValueOnce(queryPage("Launched"));
    const entries = await getHistoryForExperiment("best-day-ever");
    expect(entries.map((e) => e.milestone)).toEqual(["Launched"]);
    expect(queryMock).toHaveBeenCalledWith(
      expect.objectContaining({ data_source_id: "hist-ds" }),
    );
  });

  it("paginates until has_more is false", async () => {
    queryMock
      .mockResolvedValueOnce(queryPage("First", { hasMore: true, cursor: "c1" }))
      .mockResolvedValueOnce(queryPage("Second"));
    const entries = await getHistoryForExperiment("best-day-ever");
    expect(queryMock).toHaveBeenCalledTimes(2);
    // Second call carries the cursor from the first page.
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ start_cursor: "c1" }),
    );
    expect(entries.map((e) => e.milestone).sort()).toEqual(["First", "Second"]);
  });

  it("caches within the TTL — a second call issues no new query", async () => {
    queryMock.mockResolvedValueOnce(queryPage("Cached"));
    await getHistoryForExperiment("best-day-ever");
    await getHistoryForExperiment("best-day-ever");
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("returns [] without querying when the slug has no experiment row", async () => {
    pageIdMock.mockResolvedValueOnce(null);
    const entries = await getHistoryForExperiment("does-not-exist");
    expect(entries).toEqual([]);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("throws when the history data source env var is missing", async () => {
    vi.stubEnv("NOTION_HISTORY_DATA_SOURCE_ID", "");
    await expect(getHistoryForExperiment("best-day-ever")).rejects.toThrow(
      /NOTION_HISTORY_DATA_SOURCE_ID/,
    );
  });
});
