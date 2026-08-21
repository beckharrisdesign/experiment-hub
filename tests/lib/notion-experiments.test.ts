/**
 * Tests for lib/notion-experiments.ts — Notion → Experiment mapping and
 * fetching from the BHD Labs Projects data source.
 *
 * Mocks @notionhq/client so no real network calls are made.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockQuery, mockPageUpdate, mockBlocksList } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockPageUpdate: vi.fn(),
  mockBlocksList: vi.fn(),
}));

vi.mock("@notionhq/client", () => ({
  // Regular function so `new Client(...)` works (arrows aren't constructible).
  Client: vi.fn(function () {
    return {
      dataSources: { query: mockQuery },
      pages: { update: mockPageUpdate },
      blocks: { children: { list: mockBlocksList } },
    };
  }),
}));

import {
  hasNotionExperiments,
  mapNotionPageToExperiment,
  getExperimentsFromNotion,
  getExperimentBySlugFromNotion,
  clearNotionExperimentsCache,
  toNotionStatus,
  toNotionType,
  updateExperimentInNotion,
  formatNotionProperty,
  getExperimentFieldsFromNotion,
  getImpactRationaleFromNotion,
  clearImpactRationaleCache,
  renderBlocksToText,
  IMPACT_SCORE_COLUMNS,
  IMPACT_WHY_PAGE_TITLES,
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
      Name: title("Seed Organizer"),
      repo: richText("seed-organizer"),
      Tagline: richText("Never buy duplicate seeds again"),
      "Exec Summary": richText("A tool for tracking seed packets."),
      "Why this matters": richText("Seed boxes are chaos."),
      Hypothesis: richText("Gardeners need inventory-first tracking."),
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

  it("returns false when no auth mechanism is available", () => {
    vi.stubEnv("NOTION_TOKEN", "");
    expect(hasNotionExperiments()).toBe(false);
  });

  it("returns true with Replit connector auth and no token", () => {
    vi.stubEnv("NOTION_TOKEN", "");
    vi.stubEnv("REPLIT_CONNECTORS_HOSTNAME", "connectors.replit.test");
    vi.stubEnv("REPL_IDENTITY", "repl-identity");
    expect(hasNotionExperiments()).toBe(true);
  });

  it("returns false with a connector hostname but no repl identity", () => {
    vi.stubEnv("NOTION_TOKEN", "");
    vi.stubEnv("REPLIT_CONNECTORS_HOSTNAME", "connectors.replit.test");
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
      // No `Public` checkbox on this page → private by default.
      public: false,
    });
  });

  it("marks a row public only when the Public checkbox is checked", () => {
    expect(mapNotionPageToExperiment(makePage())?.public).toBe(false);
    expect(
      mapNotionPageToExperiment(makePage({ Public: { checkbox: false } }))
        ?.public,
    ).toBe(false);
    expect(
      mapNotionPageToExperiment(makePage({ Public: { checkbox: true } }))
        ?.public,
    ).toBe(true);
  });

  it("returns null for rows without a repo slug", () => {
    const page = makePage({ repo: richText("") });
    expect(mapNotionPageToExperiment(page)).toBeNull();
  });

  it("falls back to the legacy Slug property when repo is empty", () => {
    const page = makePage({
      repo: richText(""),
      Slug: richText("legacy-slug"),
    });
    expect(mapNotionPageToExperiment(page)?.id).toBe("legacy-slug");
  });

  it("falls back to the slug when Name is empty", () => {
    const page = makePage({ Name: title("") });
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
    // The three dead statuses map 1:1. Before they were mapped they fell
    // through to the `?? "Active"` default, so an archived row would have
    // rendered as live work the moment the Notion option existed.
    ["On Hold", "On Hold"],
    ["Archived", "Archived"],
    ["Abandoned", "Abandoned"],
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
    const page2 = makePage({ repo: richText("second-experiment") });
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

  it("filters out rows without a slug", async () => {
    mockQuery.mockResolvedValue({
      results: [makePage(), makePage({ repo: richText("") })],
      has_more: false,
    });

    const experiments = await getExperimentsFromNotion();
    expect(experiments).toHaveLength(1);
  });

  it("warns when rows exist but none map to experiments", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      mockQuery.mockResolvedValue({
        results: [makePage({ repo: richText(""), Slug: undefined })],
        has_more: false,
      });

      const experiments = await getExperimentsFromNotion();

      expect(experiments).toHaveLength(0);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("none mapped to experiments"),
      );
    } finally {
      warn.mockRestore();
    }
  });

  it("sorts by lastModified descending", async () => {
    const older = makePage({ repo: richText("older") });
    older.last_edited_time = "2026-02-01T00:00:00.000Z";
    const newer = makePage({ repo: richText("newer") });
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

  it("throws a clear error when the data source id is missing", async () => {
    vi.stubEnv("NOTION_EXPERIMENTS_DATA_SOURCE_ID", "");

    await expect(getExperimentsFromNotion()).rejects.toThrow(
      "NOTION_EXPERIMENTS_DATA_SOURCE_ID",
    );
  });

  it("authenticates via the Replit connector when NOTION_TOKEN is absent", async () => {
    vi.stubEnv("NOTION_TOKEN", "");
    vi.stubEnv("REPLIT_CONNECTORS_HOSTNAME", "connectors.replit.test");
    vi.stubEnv("REPL_IDENTITY", "repl-identity");
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({
        items: [{ settings: { access_token: "connector-token" } }],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const experiments = await getExperimentsFromNotion();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("connectors.replit.test"),
      expect.anything(),
    );
    expect(experiments).toHaveLength(1);

    vi.unstubAllGlobals();
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

// ---------------------------------------------------------------------------
// Reverse vocabulary maps
// ---------------------------------------------------------------------------

describe("toNotionStatus", () => {
  it.each([
    ["Completed", "Launched"],
    ["Graduated", "Graduated"],
    // Writable as of 2026-08-21. These depend on the matching options existing
    // on the Notion Status property; Notion's API cannot create status options,
    // so that is a manual UI step. An unmapped write would have silently picked
    // the wrong phase — an unwritable one fails loudly at the API instead.
    ["On Hold", "On Hold"],
    ["Archived", "Archived"],
    ["Abandoned", "Abandoned"],
  ])("maps hub status %s to Notion phase %s", (hubStatus, phase) => {
    expect(toNotionStatus(hubStatus)).toBe(phase);
  });

  it.each(["Ideation", "Discovery", "Business Case", "PRD", "Validating"])(
    "passes Notion phase %s through unchanged",
    (phase) => {
      expect(toNotionStatus(phase)).toBe(phase);
    },
  );

  // "Active" stays unwritable on purpose: it is the hub's collapse of five
  // distinct Notion phases, so writing it back could not pick one without
  // guessing. Callers set a specific phase by name instead.
  it.each(["Active", "Nonsense"])(
    "returns null for unwritable status %s",
    (status) => {
      expect(toNotionStatus(status)).toBeNull();
    },
  );

  it.each(["toString", "hasOwnProperty", "__proto__", "constructor"])(
    "rejects inherited object key %s",
    (key) => {
      expect(toNotionStatus(key)).toBeNull();
    },
  );
});

describe("toNotionType", () => {
  it.each([
    ["personal", "R+D"],
    ["tool", "Tool"],
    ["commercial", "Business"],
  ])("maps hub kind %s to Notion option %s", (kind, option) => {
    expect(toNotionType(kind)).toBe(option);
  });

  it("returns null for unknown kinds", () => {
    expect(toNotionType("mystery")).toBeNull();
  });

  it("rejects inherited object keys", () => {
    expect(toNotionType("toString")).toBeNull();
    expect(toNotionType("__proto__")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateExperimentInNotion
// ---------------------------------------------------------------------------

describe("updateExperimentInNotion", () => {
  it("updates the matching page with mapped properties", async () => {
    mockPageUpdate.mockResolvedValue(
      makePage({
        Name: title("Renamed"),
        Status: { status: { name: "Launched" } },
      }),
    );

    const updated = await updateExperimentInNotion("seed-organizer", {
      name: "Renamed",
      statement: "New tagline",
      status: "Completed",
      type: "tool",
    });

    expect(mockPageUpdate).toHaveBeenCalledWith({
      page_id: "page-1",
      properties: {
        Name: { title: [{ text: { content: "Renamed" } }] },
        Tagline: { rich_text: [{ text: { content: "New tagline" } }] },
        Status: { status: { name: "Launched" } },
        Type: { select: { name: "Tool" } },
      },
    });
    expect(updated?.name).toBe("Renamed");
    expect(updated?.status).toBe("Completed");
  });

  it("accepts a raw Notion phase name as status", async () => {
    mockPageUpdate.mockResolvedValue(makePage());

    await updateExperimentInNotion("seed-organizer", { status: "Discovery" });

    expect(mockPageUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: { Status: { status: { name: "Discovery" } } },
      }),
    );
  });

  it("returns null without updating when the slug is not in Notion", async () => {
    const updated = await updateExperimentInNotion("not-migrated", {
      name: "x",
    });

    expect(updated).toBeNull();
    expect(mockPageUpdate).not.toHaveBeenCalled();
  });

  // "Active" is the only status with no Notion equivalent now: it collapses
  // five Notion phases, so there is nothing unambiguous to write back. On Hold,
  // Archived and Abandoned became writable on 2026-08-21.
  it("throws for a status with no Notion equivalent", async () => {
    await expect(
      updateExperimentInNotion("seed-organizer", { status: "Active" }),
    ).rejects.toThrow("no Notion equivalent");
    expect(mockPageUpdate).not.toHaveBeenCalled();
  });

  it("throws for an unknown type", async () => {
    await expect(
      updateExperimentInNotion("seed-organizer", { type: "mystery" }),
    ).rejects.toThrow("Unknown experiment type");
    expect(mockPageUpdate).not.toHaveBeenCalled();
  });

  it("returns the current experiment without updating when no fields map", async () => {
    const updated = await updateExperimentInNotion("seed-organizer", {});

    expect(updated?.id).toBe("seed-organizer");
    expect(mockPageUpdate).not.toHaveBeenCalled();
  });

  it("invalidates the list cache after a successful update", async () => {
    mockPageUpdate.mockResolvedValue(makePage());

    await getExperimentsFromNotion();
    expect(mockQuery).toHaveBeenCalledTimes(1);

    await updateExperimentInNotion("seed-organizer", { name: "Renamed" });
    await getExperimentsFromNotion();

    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it("propagates Notion API errors", async () => {
    mockPageUpdate.mockRejectedValue(new Error("notion is down"));

    await expect(
      updateExperimentInNotion("seed-organizer", { name: "x" }),
    ).rejects.toThrow("notion is down");
  });
});

// ---------------------------------------------------------------------------
// formatNotionProperty / getExperimentFieldsFromNotion
// ---------------------------------------------------------------------------

describe("formatNotionProperty", () => {
  it("formats each common property type", () => {
    expect(formatNotionProperty(title("Hello"))).toBe("Hello");
    expect(formatNotionProperty(richText("World"))).toBe("World");
    expect(formatNotionProperty({ select: { name: "Business" } })).toBe(
      "Business",
    );
    expect(formatNotionProperty({ status: { name: "Validating" } })).toBe(
      "Validating",
    );
    expect(
      formatNotionProperty({
        multi_select: [{ name: "ai" }, { name: "tools" }],
      }),
    ).toBe("ai, tools");
    expect(formatNotionProperty({ number: 4 })).toBe("4");
    expect(formatNotionProperty({ number: 0 })).toBe("0");
    expect(formatNotionProperty({ checkbox: true })).toBe("Yes");
    expect(formatNotionProperty({ checkbox: false })).toBe("No");
    expect(formatNotionProperty({ date: { start: "2026-07-01" } })).toBe(
      "2026-07-01",
    );
    expect(
      formatNotionProperty({
        date: { start: "2026-07-01", end: "2026-07-12" },
      }),
    ).toBe("2026-07-01 → 2026-07-12");
    expect(formatNotionProperty({ url: "https://example.com" })).toBe(
      "https://example.com",
    );
    expect(formatNotionProperty({ email: "k@example.com" })).toBe(
      "k@example.com",
    );
    expect(
      formatNotionProperty({ people: [{ name: "Katy" }, { name: "Sam" }] }),
    ).toBe("Katy, Sam");
    expect(formatNotionProperty({ formula: { string: "computed" } })).toBe(
      "computed",
    );
  });

  it("returns empty string for empty or unknown properties", () => {
    expect(formatNotionProperty({ rich_text: [] })).toBe("");
    expect(formatNotionProperty({ select: null })).toBe("");
    expect(formatNotionProperty({ number: null })).toBe("");
    expect(formatNotionProperty({ relation: [{ id: "abc" }] })).toBe("");
  });
});

describe("getExperimentFieldsFromNotion", () => {
  it("returns only the allowlisted narrative statements, in order", async () => {
    const fields = await getExperimentFieldsFromNotion("seed-organizer");

    expect(fields).toEqual([
      { label: "Why this matters", value: "Seed boxes are chaos." },
      {
        label: "Hypothesis",
        value: "Gardeners need inventory-first tracking.",
      },
      { label: "Exec Summary", value: "A tool for tracking seed packets." },
    ]);
  });

  it("never leaks bookkeeping, scores, status, type, or hero fields", async () => {
    // Even with extra bookkeeping columns present, only the allowlist renders.
    mockQuery.mockResolvedValue({
      results: [
        makePage({
          "Last edited time": { last_edited_time: "2026-07-01T00:00:00.000Z" },
          "Name Alt": richText("seed-organizer"),
          Public: { checkbox: true },
          Website: { url: "https://example.com" },
        }),
      ],
      has_more: false,
    });

    const labels = (await getExperimentFieldsFromNotion("seed-organizer"))!.map(
      (f) => f.label,
    );
    expect(labels).toEqual(["Why this matters", "Hypothesis", "Exec Summary"]);
    for (const leaked of [
      "Name",
      "Tagline",
      "Status",
      "Type",
      "repo",
      "Score:B",
      "Last edited time",
      "Name Alt",
      "Public",
      "Website",
    ]) {
      expect(labels).not.toContain(leaked);
    }
  });

  it("omits an allowlisted statement that is empty", async () => {
    mockQuery.mockResolvedValue({
      results: [makePage({ Hypothesis: { rich_text: [] } })],
      has_more: false,
    });

    const labels = (await getExperimentFieldsFromNotion("seed-organizer"))!.map(
      (f) => f.label,
    );
    expect(labels).toEqual(["Why this matters", "Exec Summary"]);
  });

  it("returns null for an unknown slug", async () => {
    expect(await getExperimentFieldsFromNotion("nope")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// v3 impact scores (scoring-impact-rubric)
// ---------------------------------------------------------------------------

describe("mapNotionPageToExperiment · impact scores", () => {
  it("pins the column-name contract", () => {
    expect(IMPACT_SCORE_COLUMNS).toEqual({
      personal: "Score:PI",
      social: "Score:SI",
      business: "Score:BI",
    });
    expect(IMPACT_WHY_PAGE_TITLES).toEqual({
      personal: "Why: Personal",
      social: "Why: Social",
      business: "Why: Business",
    });
  });

  it("maps the three impact columns", () => {
    const experiment = mapNotionPageToExperiment(
      makePage({
        "Score:PI": { number: 5 },
        "Score:SI": { number: 4 },
        "Score:BI": { number: 2 },
      }) as never,
    );
    expect(experiment?.impactScores).toEqual({
      personal: 5,
      social: 4,
      business: 2,
    });
  });

  it("keeps both shapes when v1 columns are also filled", () => {
    const experiment = mapNotionPageToExperiment(
      makePage({
        "Score:PI": { number: 5 },
        "Score:SI": { number: 4 },
        "Score:BI": { number: 2 },
        "Score:B": { number: 2 },
        "Score:P": { number: 5 },
        "Score:C": { number: 3 },
        "Score:D": { number: 4 },
        "Score:S": { number: 5 },
      }) as never,
    );
    expect(experiment?.impactScores).toEqual({
      personal: 5,
      social: 4,
      business: 2,
    });
    expect(experiment?.scores).toBeDefined();
  });

  it("leaves partial impact rows unscored rather than fabricating", () => {
    const experiment = mapNotionPageToExperiment(
      makePage({
        "Score:PI": { number: 5 },
        "Score:SI": { number: 4 },
      }) as never,
    );
    expect(experiment?.impactScores).toBeUndefined();
  });

  it("drift in a column name reads as unscored (title-drift guard)", () => {
    const experiment = mapNotionPageToExperiment(
      makePage({
        "Score:Pi": { number: 5 }, // wrong case
        "Score:SI": { number: 4 },
        "Score:BI": { number: 2 },
      }) as never,
    );
    expect(experiment?.impactScores).toBeUndefined();
  });
});

describe("renderBlocksToText", () => {
  const rt = (text: string) => ({ rich_text: [{ plain_text: text }] });

  it("renders the allowlisted block types with structure", () => {
    const text = renderBlocksToText([
      { type: "heading_2", heading_2: rt("The case") },
      { type: "paragraph", paragraph: rt("First paragraph.") },
      { type: "bulleted_list_item", bulleted_list_item: rt("one") },
      { type: "bulleted_list_item", bulleted_list_item: rt("two") },
      { type: "quote", quote: rt("a supporting quote") },
      { type: "divider", divider: {} },
      { type: "paragraph", paragraph: rt("Second paragraph.") },
    ]);
    expect(text).toBe(
      "## The case\n\nFirst paragraph.\n\n- one\n- two\n\n> a supporting quote\n\n---\n\nSecond paragraph.",
    );
  });

  it("keeps plain text of unknown block types and drops empties", () => {
    const text = renderBlocksToText([
      { type: "callout", callout: rt("kept as plain text") },
      { type: "image", image: {} },
      { type: "paragraph", paragraph: rt("") },
    ]);
    expect(text).toBe("kept as plain text");
  });
});

describe("getImpactRationaleFromNotion", () => {
  beforeEach(() => {
    clearNotionExperimentsCache();
    clearImpactRationaleCache();
    process.env.NOTION_TOKEN = "test-token";
    process.env.NOTION_EXPERIMENTS_DATA_SOURCE_ID = "ds-1";
    mockQuery.mockResolvedValue({
      results: [makePage()],
      has_more: false,
    });
  });

  afterEach(() => {
    delete process.env.NOTION_TOKEN;
    delete process.env.NOTION_EXPERIMENTS_DATA_SOURCE_ID;
    mockQuery.mockReset();
    mockBlocksList.mockReset();
  });

  const rt = (text: string) => ({ rich_text: [{ plain_text: text }] });

  it("reads justifications from Why: child pages; missing pages are absent", async () => {
    mockBlocksList.mockImplementation(async ({ block_id }) => {
      if (block_id === "page-1") {
        return {
          results: [
            {
              id: "why-personal",
              type: "child_page",
              child_page: { title: "Why: Personal" },
            },
            // No Social or Business pages on this row.
          ],
          has_more: false,
        };
      }
      if (block_id === "why-personal") {
        return {
          results: [
            { type: "paragraph", paragraph: rt("I use it every season.") },
            { type: "paragraph", paragraph: rt("It keeps me building.") },
          ],
          has_more: false,
        };
      }
      return { results: [], has_more: false };
    });

    const rationale = await getImpactRationaleFromNotion("seed-organizer");
    expect(rationale).toEqual({
      personal: "I use it every season.\n\nIt keeps me building.",
    });
  });

  it("returns {} for unknown slugs without calling the blocks API", async () => {
    const rationale = await getImpactRationaleFromNotion("nope");
    expect(rationale).toEqual({});
    expect(mockBlocksList).not.toHaveBeenCalled();
  });
});
