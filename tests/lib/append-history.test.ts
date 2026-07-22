import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Structural guarantees — read the source, assert the invariants hold by
// construction (not just by current behavior).
// ---------------------------------------------------------------------------

const root = resolve(__dirname, "../..");
const draftSrc = readFileSync(resolve(root, "scripts/draft-history.ts"), "utf8");
const appendSrc = readFileSync(
  resolve(root, "scripts/append-history.ts"),
  "utf8",
);

describe("structural guarantees", () => {
  it("the generator imports no Notion client (never publishes) — spec Req 4", () => {
    expect(draftSrc).not.toMatch(/@\/lib\/notion\b/);
    expect(draftSrc).not.toMatch(/@notionhq\/client/);
  });

  it("the append writer is insert-only — no update/delete/archive — spec Req 5", () => {
    expect(appendSrc).not.toMatch(/pages\.update/);
    expect(appendSrc).not.toMatch(/\.delete\(/);
    expect(appendSrc).not.toMatch(/archived:\s*true/);
    expect(appendSrc).not.toMatch(/in_trash/);
    // The only mutating call it may make:
    expect(appendSrc).toMatch(/pages\.create/);
  });
});

// ---------------------------------------------------------------------------
// Behavioral — watermark, dry-run, and the unapproved gate.
// ---------------------------------------------------------------------------

const { queryMock, createMock, pageIdMock, candidatesMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  createMock: vi.fn(),
  pageIdMock: vi.fn(),
  candidatesMock: vi.fn(),
}));

vi.mock("@/lib/notion", () => ({
  getUncachableNotionClient: vi.fn(async () => ({
    dataSources: { query: queryMock },
    pages: { create: createMock },
  })),
}));
vi.mock("@/lib/notion-experiments", () => ({
  getExperimentPageIdFromNotion: pageIdMock,
}));
vi.mock("@/scripts/draft-history", () => ({
  generateCandidates: candidatesMock,
}));

import { appendHistory } from "@/scripts/append-history";

const CANDIDATES = [
  { month: "2026-03", date: "2026-03-01", milestone: "March work", source: "7 commits" },
  { month: "2026-04", date: "2026-04-01", milestone: "April work", source: "4 commits" },
];

function noExistingRows() {
  queryMock.mockResolvedValue({ results: [], has_more: false, next_cursor: null });
}

describe("appendHistory", () => {
  beforeEach(() => {
    vi.stubEnv("NOTION_HISTORY_DATA_SOURCE_ID", "hist-ds");
    pageIdMock.mockResolvedValue("exp-page-1");
    candidatesMock.mockReturnValue(CANDIDATES);
    createMock.mockReset().mockResolvedValue({ id: "new-row" });
    queryMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("dry run writes nothing", async () => {
    noExistingRows();
    const res = await appendHistory("best-day-ever", { write: false });
    expect(createMock).not.toHaveBeenCalled();
    expect(res).toEqual({ created: 0, skipped: 2 });
  });

  it("with --write, inserts each uncovered month, all unapproved", async () => {
    noExistingRows();
    const res = await appendHistory("best-day-ever", { write: true });
    expect(res).toEqual({ created: 2, skipped: 0 });
    expect(createMock).toHaveBeenCalledTimes(2);
    const first = createMock.mock.calls[0][0];
    // Appended into the History data source, unapproved, related to the exp.
    expect(first.parent).toEqual({
      type: "data_source_id",
      data_source_id: "hist-ds",
    });
    expect(first.properties.Approved).toEqual({ checkbox: false });
    expect(first.properties.Experiment).toEqual({
      relation: [{ id: "exp-page-1" }],
    });
    expect(first.properties.Date).toEqual({ date: { start: "2026-03-01" } });
  });

  it("skips months already present — a re-run is a no-op", async () => {
    // March already exists; only April should be appended.
    queryMock.mockResolvedValue({
      results: [{ properties: { Date: { date: { start: "2026-03-20" } } } }],
      has_more: false,
      next_cursor: null,
    });
    const res = await appendHistory("best-day-ever", { write: true });
    expect(res).toEqual({ created: 1, skipped: 0 });
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock.mock.calls[0][0].properties.Date).toEqual({
      date: { start: "2026-04-01" },
    });
  });

  it("appends nothing when every candidate month is already present", async () => {
    queryMock.mockResolvedValue({
      results: [
        { properties: { Date: { date: { start: "2026-03-01" } } } },
        { properties: { Date: { date: { start: "2026-04-01" } } } },
      ],
      has_more: false,
      next_cursor: null,
    });
    const res = await appendHistory("best-day-ever", { write: true });
    expect(res).toEqual({ created: 0, skipped: 0 });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("throws when the history data source env var is missing", async () => {
    vi.stubEnv("NOTION_HISTORY_DATA_SOURCE_ID", "");
    await expect(
      appendHistory("best-day-ever", { write: true }),
    ).rejects.toThrow(/NOTION_HISTORY_DATA_SOURCE_ID/);
  });

  it("throws when no Notion experiment row matches the slug", async () => {
    noExistingRows();
    pageIdMock.mockResolvedValueOnce(null);
    await expect(
      appendHistory("ghost", { write: true }),
    ).rejects.toThrow(/No Notion experiment row/);
  });
});
