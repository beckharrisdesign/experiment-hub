/**
 * POST /api/landing-submission — Best Day Ever form submission tests.
 *
 * Tests the full request→route→Notion flow with a mocked Notion client.
 * The mock prevents any real network calls; assertions cover the contract
 * the landing page script.js depends on.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock @/lib/notion before the route is imported so the Replit connector
// code never runs and submitLandingPageResponse is fully controllable.
vi.mock("@/lib/notion", () => ({
  submitLandingPageResponse: vi.fn(),
}));

import { POST, OPTIONS } from "@/app/api/landing-submission/route";
import { submitLandingPageResponse } from "@/lib/notion";

const mockSubmit = vi.mocked(submitLandingPageResponse);

const TEST_DB_ID = "test-bde-database-id-abc123";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/landing-submission", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/landing-submission — Best Day Ever", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.NOTION_LANDING_DATABASE_ID_BEST_DAY_EVER = TEST_DB_ID;
    delete process.env.NOTION_LANDING_DATABASE_ID;
  });

  afterEach(() => {
    delete process.env.NOTION_LANDING_DATABASE_ID_BEST_DAY_EVER;
    delete process.env.NOTION_LANDING_DATABASE_ID;
  });

  // ---------------------------------------------------------------------------
  // Happy path
  // ---------------------------------------------------------------------------

  it("returns 200 with success and pageId on a valid submission", async () => {
    mockSubmit.mockResolvedValueOnce({ id: "notion-page-abc123" } as any);

    const res = await POST(
      makeRequest({
        experiment: "Best Day Ever",
        email: "alex@example.com",
        name: "Alex",
        source: "landing-page",
        notes: "Calendar: Google Calendar | Paper usage: Sometimes",
      }),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.pageId).toBe("notion-page-abc123");
  });

  it("calls submitLandingPageResponse with the BDE database ID", async () => {
    mockSubmit.mockResolvedValueOnce({ id: "page-id" } as any);

    await POST(
      makeRequest({
        experiment: "Best Day Ever",
        email: "alex@example.com",
        source: "landing-page",
      }),
    );

    expect(mockSubmit).toHaveBeenCalledOnce();
    expect(mockSubmit).toHaveBeenCalledWith(TEST_DB_ID, expect.anything());
  });

  it("passes all form fields through to submitLandingPageResponse", async () => {
    mockSubmit.mockResolvedValueOnce({ id: "page-id" } as any);

    await POST(
      makeRequest({
        experiment: "Best Day Ever",
        email: "alex@example.com",
        name: "Alex",
        source: "landing-page",
        notes:
          "Calendar: Google Calendar | Paper usage: Yes, every day | Hardest part: Getting started",
      }),
    );

    expect(mockSubmit).toHaveBeenCalledWith(
      TEST_DB_ID,
      expect.objectContaining({
        experiment: "Best Day Ever",
        email: "alex@example.com",
        name: "Alex",
        source: "landing-page",
        notes: expect.stringContaining("Google Calendar"),
      }),
    );
  });

  it("works with email only (all other fields optional)", async () => {
    mockSubmit.mockResolvedValueOnce({ id: "page-id" } as any);

    const res = await POST(
      makeRequest({
        experiment: "Best Day Ever",
        email: "minimal@example.com",
      }),
    );

    expect(res.status).toBe(200);
    expect(mockSubmit).toHaveBeenCalledOnce();
  });

  // ---------------------------------------------------------------------------
  // Env key derivation: "Best Day Ever" → NOTION_LANDING_DATABASE_ID_BEST_DAY_EVER
  // ---------------------------------------------------------------------------

  it("derives the correct env key from the experiment name", async () => {
    // Clear the per-experiment key and set only the fallback
    delete process.env.NOTION_LANDING_DATABASE_ID_BEST_DAY_EVER;
    const FALLBACK_DB_ID = "fallback-db-id";
    process.env.NOTION_LANDING_DATABASE_ID = FALLBACK_DB_ID;

    mockSubmit.mockResolvedValueOnce({ id: "page-id" } as any);

    await POST(
      makeRequest({ experiment: "Best Day Ever", email: "test@example.com" }),
    );

    // Should have used the fallback database ID
    expect(mockSubmit).toHaveBeenCalledWith(FALLBACK_DB_ID, expect.anything());
  });

  it("prefers NOTION_LANDING_DATABASE_ID_BEST_DAY_EVER over the fallback", async () => {
    process.env.NOTION_LANDING_DATABASE_ID = "should-not-use-this";

    mockSubmit.mockResolvedValueOnce({ id: "page-id" } as any);

    await POST(
      makeRequest({ experiment: "Best Day Ever", email: "test@example.com" }),
    );

    expect(mockSubmit).toHaveBeenCalledWith(TEST_DB_ID, expect.anything());
  });

  // ---------------------------------------------------------------------------
  // Validation errors
  // ---------------------------------------------------------------------------

  it("returns 400 when email is missing", async () => {
    const res = await POST(
      makeRequest({ experiment: "Best Day Ever", source: "landing-page" }),
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/email/i);
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Configuration errors
  // ---------------------------------------------------------------------------

  it("returns 500 when no Notion database ID is configured", async () => {
    delete process.env.NOTION_LANDING_DATABASE_ID_BEST_DAY_EVER;
    delete process.env.NOTION_LANDING_DATABASE_ID;

    const res = await POST(
      makeRequest({ experiment: "Best Day Ever", email: "test@example.com" }),
    );
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toMatch(/database ID/i);
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Notion errors surfaced to the caller
  // ---------------------------------------------------------------------------

  it("returns 500 and surfaces Notion error code when page creation fails", async () => {
    const notionError = Object.assign(new Error("Could not find database"), {
      body: { code: "object_not_found", message: "Could not find database" },
    });
    mockSubmit.mockRejectedValueOnce(notionError);

    const res = await POST(
      makeRequest({ experiment: "Best Day Ever", email: "test@example.com" }),
    );
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to submit response");
    expect(data.details).toContain("object_not_found");
    expect(data.details).toContain("Could not find database");
  });

  it("returns 500 when Notion throws a generic error", async () => {
    mockSubmit.mockRejectedValueOnce(new Error("Network timeout"));

    const res = await POST(
      makeRequest({ experiment: "Best Day Ever", email: "test@example.com" }),
    );
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.details).toContain("Network timeout");
  });

  // ---------------------------------------------------------------------------
  // CORS
  // ---------------------------------------------------------------------------

  it("responds to OPTIONS preflight with 204", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
  });

  it("includes CORS headers on the POST response", async () => {
    mockSubmit.mockResolvedValueOnce({ id: "page-id" } as any);

    const res = await POST(
      makeRequest({ experiment: "Best Day Ever", email: "test@example.com" }),
    );

    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });
});
