/**
 * Tests for lib/notion-experiments.ts — Notion → Experiment mapping and
 * fetching from the BHD Labs Projects data source.
 *
 * Mocks @notionhq/client so no real network calls are made.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock("@notionhq/client", () => ({
  // Regular function so `new Client(...)` works (arrows aren't constructible).
  Client: vi.fn(function () {
    return { dataSources: { query: mockQuery } };
  }),
}));

import {
  hasNotionExperiments,
  mapNotionPageToExperiment,
  getExperimentsFromNotion,
  getExperimentBySlugFromNotion,
  clearNotionExperimentsCache,
} from "@/lib/notion-experiments";

// ---------------------------------------------------------------------------
// Test factories
// ---------------------------------------------------------------------------

function title(text: string) {
  return { title: [{ plain_text: text }] };
}

function richText(text: string) {
  return { rich_text: [{ plain_text: text }] };
}

function makePage(overrides: Record<string, unknown> = {}) {
  return {
    id: "page-1",
    created_time: "2026-01-01T00:00:00.000Z",
    last_edited_time: "2026-06-01T00:00:00.000Z",
    properties: {
      Slug: title("seed-organizer"),
      Name: richText("Seed Organizer"),
      Tagline: richText("Never buy duplicate seeds again"),
      "Exec Summary": richText("A tool for tracking seed packets."),
      Status: { status: { name: "Validating" } },
      Type: { select: { name: "Business" } },
      "Score:B": { number: 4 },
      "Score:P": { number: 5 },
      "Score:C": { number: 3 },
      "Score:D": { number: 4 },
      "Score:S": { number: 2 },
      ...(overrides as Record<string, never>),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  clearNotionExperimentsCache();
  vi.stubEnv("NOTION_TOKEN", "secret-token");
  vi.stubEnv(
    "NOTION_EXPERIMENTS_DATA_SOURCE_ID",
    "399b908d-7b37-80cb-beb5-000b54ca2967",
  );
  mockQuery.mockResolvedValue({ results: [makePage()], has_more: false });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------------------
// hasNotionExperiments
// ---------------------------------------------------------------------------

describe("hasNotionExperiments", () => {
  it("returns true when token and data source id are set", () => {
    expect(hasNotionExperiments()).toBe(true);
  });

  it("returns false when the token is missing", () => {
    vi.stubEnv("NOTION_TOKEN", "");
    expect(hasNotionExperiments()).toBe(false);
  });

  it("returns false when the data source id is missing", () => {
    vi.stubEnv("NOTION_EXPERIMENTS_DATA_SOURCE_ID", "");
    expect(hasNotionExperiments()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// mapNotionPageToExperiment
// ---------------------------------------------------------------------------

describe("mapNotionPageToExperiment", () => {
  it("maps a fully populated page onto the Experiment shape", () => {
    const experiment = mapNotionPageToExperiment(makePage());

    expect(experiment).toEqual({
      id: "seed-organizer",
      name: "Seed Organizer",
      statement: "Never buy duplicate seeds again",
      type: "commercial",
      directory: "experiments/seed-organizer",
      documentationId: "",
      prototypeId: "",
      status: "Active",
      createdDate: "2026-01-01T00:00:00.000Z",
      lastModified: "2026-06-01T00:00:00.000Z",
      tags: [],
      scores: {
        businessOpportunity: 4,
        personalImpact: 5,
        competitiveAdvantage: 3,
        platformCost: 4,
        socialImpact: 2,
      },
    });
  });

  it("returns null for rows without a Slug", () => {
    const page = makePage({ Slug: title("") });
    expect(mapNotionPageToExperiment(page)).toBeNull();
  });

  it("falls back to Slug when Name is empty", () => {
    const page = makePage({ Name: richText("") });
    expect(mapNotionPageToExperiment(page)?.name).toBe("seed-organizer");
  });

  it("falls back to Exec Summary when Tagline is empty", () => {
    const page = makePage({ Tagline: richText("") });
    expect(mapNotionPageToExperiment(page)?.statement).toBe(
      "A tool for tracking seed packets.",
    );
  });

  it.each([
    ["Ideation", "Active"],
    ["Discovery", "Active"],
    ["Business Case", "Active"],
    ["PRD", "Active"],
    ["Validating", "Active"],
    ["Launched", "Completed"],
    ["Graduated", "Graduated"],
    ["Unknown Phase", "Active"],
  ])("maps Notion status %s to hub status %s", (notionStatus, hubStatus) => {
    const page = makePage({ Status: { status: { name: notionStatus } } });
    expect(mapNotionPageToExperiment(page)?.status).toBe(hubStatus);
  });

  it.each([
    ["R+D", "personal"],
    ["Tool", "tool"],
    ["Business", "commercial"],
  ])("maps Notion type %s to hub kind %s", (notionType, hubKind) => {
    const page = makePage({ Type: { select: { name: notionType } } });
    expect(mapNotionPageToExperiment(page)?.type).toBe(hubKind);
  });

  it("omits type for unrecognized Type options", () => {
    const page = makePage({ Type: { select: null } });
    expect(mapNotionPageToExperiment(page)?.type).toBeUndefined();
  });

  it("omits scores when any dimension is missing", () => {
    const page = makePage({ "Score:D": { number: null } });
    expect(mapNotionPageToExperiment(page)?.scores).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getExperimentsFromNotion
// ---------------------------------------------------------------------------

describe("getExperimentsFromNotion", () => {
  it("queries the configured data source and maps results", async () => {
    const experiments = await getExperimentsFromNotion();

    expect(mockQuery).toHaveBeenCalledWith({
      data_source_id: "399b908d-7b37-80cb-beb5-000b54ca2967",
    });
    expect(experiments).toHaveLength(1);
    expect(experiments[0].id).toBe("seed-organizer");
  });

  it("paginates until has_more is false", async () => {
    const page2 = makePage({ Slug: title("second-experiment") });
    mockQuery
      .mockResolvedValueOnce({
        results: [makePage()],
        has_more: true,
        next_cursor: "cursor-2",
      })
      .mockResolvedValueOnce({ results: [page2], has_more: false });

    const experiments = await getExperimentsFromNotion();

    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery).toHaveBeenLastCalledWith({
      data_source_id: "399b908d-7b37-80cb-beb5-000b54ca2967",
      start_cursor: "cursor-2",
    });
    expect(experiments).toHaveLength(2);
  });

  it("filters out untitled rows", async () => {
    mockQuery.mockResolvedValue({
      results: [makePage(), makePage({ Slug: title("") })],
      has_more: false,
    });

    const experiments = await getExperimentsFromNotion();
    expect(experiments).toHaveLength(1);
  });

  it("sorts by lastModified descending", async () => {
    const older = makePage({ Slug: title("older") });
    older.last_edited_time = "2026-02-01T00:00:00.000Z";
    const newer = makePage({ Slug: title("newer") });
    newer.last_edited_time = "2026-07-01T00:00:00.000Z";
    mockQuery.mockResolvedValue({
      results: [older, newer],
      has_more: false,
    });

    const experiments = await getExperimentsFromNotion();
    expect(experiments.map((exp) => exp.id)).toEqual(["newer", "older"]);
  });

  it("serves the cached list within the TTL without re-querying", async () => {
    await getExperimentsFromNotion();
    await getExperimentsFromNotion();

    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it("propagates Notion API errors so callers can fall back", async () => {
    mockQuery.mockRejectedValue(new Error("notion is down"));

    await expect(getExperimentsFromNotion()).rejects.toThrow("notion is down");
  });
});

// ---------------------------------------------------------------------------
// getExperimentBySlugFromNotion
// ---------------------------------------------------------------------------

describe("getExperimentBySlugFromNotion", () => {
  it("returns the experiment matching the slug", async () => {
    const experiment = await getExperimentBySlugFromNotion("seed-organizer");
    expect(experiment?.name).toBe("Seed Organizer");
  });

  it("returns null when no row matches", async () => {
    const experiment = await getExperimentBySlugFromNotion("nope");
    expect(experiment).toBeNull();
  });
});
