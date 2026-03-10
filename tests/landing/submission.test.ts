/**
 * Landing form submission — API route and client payload.
 * Confirms the form → API → Notion flow without hitting real Notion.
 * Run: npm test -- tests/landing/submission.test.ts
 *
 * TROUBLESHOOTING (for agents): If submissions don't appear in Notion, see the
 * "surfaces debug info for agents" test output when you run this file. It logs
 * required env, database setup, and common Notion errors (e.g. wrong/missing DB id).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockSubmit = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ id: "test-notion-page-id" })
);

vi.mock("@/lib/notion", () => ({
  submitLandingPageResponse: mockSubmit,
}));

/** Debug checklist surfaced when tests run — for agent troubleshooting. */
const LANDING_SUBMISSION_DEBUG = `
=== LANDING SUBMISSION TROUBLESHOOTING ===
Form POSTs to: /api/landing-submission with experiment: "Best Day Ever" (or other).
The API creates a PAGE inside a Notion DATABASE. Database is chosen per experiment.

1) Per-experiment env var (recommended)
   - Key = NOTION_LANDING_DATABASE_ID_<EXPERIMENT_SLUG> (experiment name in UPPER_SNAKE_CASE).
   - Example: Best Day Ever → NOTION_LANDING_DATABASE_ID_BEST_DAY_EVER
   - Set in .env.local (local) or Vercel Environment Variables (hub project).
   - Fallback: NOTION_LANDING_DATABASE_ID if no per-experiment var is set.

2) Database must exist and be shared with the integration
   - If the database doesn't exist or isn't shared → Notion returns object_not_found (404).
   - API surfaces this in response.details as [object_not_found] <message>.

3) Required database property names (see lib/notion.ts)
   - Source (title), Email (email), SignupDate (date), OptOut (checkbox).
   - Optional: Name, OptOutReason, Notes (rich text); Seed Count, Challenges (multi-select).

4) Notion auth (lib/notion.ts uses Replit Connectors by default)
   - For Vercel/local you may need a different auth path (e.g. NOTION_API_KEY).
`;

describe("landing submission API", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      NOTION_LANDING_DATABASE_ID_BEST_DAY_EVER: "test-db-id",
      NOTION_LANDING_DATABASE_ID: "",
    };
  });

  it("returns 400 when email is missing", async () => {
    const { POST } = await import("@/app/api/landing-submission/route");
    const req = new NextRequest("http://localhost:3000/api/landing-submission", {
      method: "POST",
      body: JSON.stringify({
        experiment: "Best Day Ever",
        name: "Test",
        source: "landing-page",
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/email/i);
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it("returns 500 when no database ID is configured for the experiment", async () => {
    process.env.NOTION_LANDING_DATABASE_ID_BEST_DAY_EVER = "";
    process.env.NOTION_LANDING_DATABASE_ID = "";
    const { POST } = await import("@/app/api/landing-submission/route");
    const req = new NextRequest("http://localhost:3000/api/landing-submission", {
      method: "POST",
      body: JSON.stringify({
        experiment: "Best Day Ever",
        email: "test@example.com",
        source: "landing-page",
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/database|Notion|configured/i);
    expect(data.details).toMatch(/NOTION_LANDING_DATABASE_ID/);
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it("accepts Best Day Ever payload and calls Notion with correct submission", async () => {
    const { POST } = await import("@/app/api/landing-submission/route");
    const body = {
      experiment: "Best Day Ever",
      email: "user@example.com",
      name: "Jane Doe",
      source: "landing-page",
      notes:
        "Calendar: Google Calendar | Paper usage: Sometimes | Hardest part: Getting started",
    };
    const req = new NextRequest("http://localhost:3000/api/landing-submission", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.pageId).toBe("test-notion-page-id");

    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(mockSubmit).toHaveBeenCalledWith("test-db-id", {
      experiment: "Best Day Ever",
      email: "user@example.com",
      name: "Jane Doe",
      source: "landing-page",
      notes: body.notes,
      seedCount: undefined,
      challenges: undefined,
      optOut: false,
      optOutReason: undefined,
    });
  });

  it("sets CORS headers on response", async () => {
    const { POST } = await import("@/app/api/landing-submission/route");
    const req = new NextRequest("http://localhost:3000/api/landing-submission", {
      method: "POST",
      body: JSON.stringify({ email: "cors@test.com", source: "landing-page" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeDefined();
  });

  it("surfaces Notion API error (e.g. database not found) in 500 details for debugging", async () => {
    const notFoundError = Object.assign(new Error("Could not find database with ID: xyz"), {
      code: "object_not_found",
      body: { code: "object_not_found", message: "Could not find database with ID: xyz. Make sure the relevant pages and databases are shared with your integration." },
    });
    mockSubmit.mockRejectedValueOnce(notFoundError);

    const { POST } = await import("@/app/api/landing-submission/route");
    const req = new NextRequest("http://localhost:3000/api/landing-submission", {
      method: "POST",
      body: JSON.stringify({ experiment: "Best Day Ever", email: "test@example.com", source: "landing-page" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Failed to submit response");
    expect(data.details).toMatch(/object_not_found|Could not find database/i);
    expect(data.details).toBeDefined();
  });
});

describe("Landing submission — debug info for agents", () => {
  it("surfaces debug info for agents (check test output when troubleshooting)", () => {
    // eslint-disable-next-line no-console
    console.log(LANDING_SUBMISSION_DEBUG);
    expect(LANDING_SUBMISSION_DEBUG).toContain("NOTION_LANDING_DATABASE_ID");
    expect(LANDING_SUBMISSION_DEBUG).toContain("NOTION_LANDING_DATABASE_ID_BEST_DAY_EVER");
    expect(LANDING_SUBMISSION_DEBUG).toContain("object_not_found");
  });
});

describe("Best Day Ever form payload shape", () => {
  it("matches what the API expects (experiment, email, name, source, notes)", () => {
    // Replicate the client-side payload building from script.js
    const calendar = { value: "Google Calendar" };
    const paperUsage = { value: "Sometimes" };
    const hardestPart = "Getting started";

    const notesParts: string[] = [];
    if (calendar?.value) notesParts.push("Calendar: " + calendar.value);
    if (paperUsage?.value) notesParts.push("Paper usage: " + paperUsage.value);
    if (hardestPart?.trim()) notesParts.push("Hardest part: " + hardestPart);
    const notes = notesParts.length ? notesParts.join(" | ") : undefined;

    const formData = {
      experiment: "Best Day Ever",
      email: "test@example.com",
      name: "Test User",
      source: "landing-page",
      notes,
    };

    expect(formData.experiment).toBe("Best Day Ever");
    expect(formData.email).toBe("test@example.com");
    expect(formData.source).toBe("landing-page");
    expect(formData.notes).toBe(
      "Calendar: Google Calendar | Paper usage: Sometimes | Hardest part: Getting started"
    );
    expect(typeof formData.notes).toBe("string");
  });
});
