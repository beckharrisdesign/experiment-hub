/**
 * POST /api/landing-submission — experiment waitlist submission tests.
 *
 * Tests the full request→route→Supabase flow with a mocked insertSubmission.
 * No real network calls are made; assertions cover the contract
 * that landing page scripts depend on.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock @/lib/supabase before importing the route so no real Supabase calls happen.
vi.mock("@/lib/supabase", () => ({
  insertSubmission: vi.fn(),
}));

import { POST, OPTIONS } from "@/app/api/landing-submission/route";
import { insertSubmission } from "@/lib/supabase";

const mockInsert = vi.mocked(insertSubmission);

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/landing-submission", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/landing-submission", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Happy path
  // ---------------------------------------------------------------------------

  it("returns 200 with success and id on a valid submission", async () => {
    mockInsert.mockResolvedValueOnce({ id: "supabase-row-uuid-123" });

    const res = await POST(
      makeRequest({
        experiment: "best-day-ever",
        email: "alex@example.com",
        name: "Alex",
        source: "landing-page",
      }),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.id).toBe("supabase-row-uuid-123");
  });

  it("passes all standard fields through to insertSubmission", async () => {
    mockInsert.mockResolvedValueOnce({ id: "row-id" });

    await POST(
      makeRequest({
        experiment: "best-day-ever",
        email: "alex@example.com",
        name: "Alex",
        source: "facebook-ad",
        notes: "Heard about it from a friend",
      }),
    );

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        experiment: "best-day-ever",
        email: "alex@example.com",
        name: "Alex",
        source: "facebook-ad",
        notes: "Heard about it from a friend",
      }),
    );
  });

  it("works with email only (all other fields optional)", async () => {
    mockInsert.mockResolvedValueOnce({ id: "row-id" });

    const res = await POST(makeRequest({ email: "minimal@example.com" }));

    expect(res.status).toBe(200);
    expect(mockInsert).toHaveBeenCalledOnce();
  });

  it("defaults experiment to 'unknown' when omitted", async () => {
    mockInsert.mockResolvedValueOnce({ id: "row-id" });

    await POST(makeRequest({ email: "test@example.com" }));

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ experiment: "unknown" }),
    );
  });

  it("defaults source to 'landing-page' when omitted", async () => {
    mockInsert.mockResolvedValueOnce({ id: "row-id" });

    await POST(makeRequest({ email: "test@example.com" }));

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ source: "landing-page" }),
    );
  });

  it("packs extra fields into metadata", async () => {
    mockInsert.mockResolvedValueOnce({ id: "row-id" });

    await POST(
      makeRequest({
        experiment: "seed-organizer",
        email: "test@example.com",
        seedCount: "20-50",
        challenges: ["Buying duplicates"],
      }),
    );

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { seedCount: "20-50", challenges: ["Buying duplicates"] },
      }),
    );
  });

  // ---------------------------------------------------------------------------
  // Validation errors
  // ---------------------------------------------------------------------------

  it("returns 400 when email is missing", async () => {
    const res = await POST(
      makeRequest({ experiment: "best-day-ever", source: "landing-page" }),
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/email/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

  it("returns 500 when Supabase throws", async () => {
    mockInsert.mockRejectedValueOnce(new Error("connection refused"));

    const res = await POST(
      makeRequest({ experiment: "best-day-ever", email: "test@example.com" }),
    );
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to submit response");
    expect(data.details).toContain("connection refused");
  });

  // ---------------------------------------------------------------------------
  // CORS
  // ---------------------------------------------------------------------------

  it("responds to OPTIONS preflight with 204", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
  });

  it("includes CORS headers on the POST response", async () => {
    mockInsert.mockResolvedValueOnce({ id: "row-id" });

    const res = await POST(
      makeRequest({ experiment: "best-day-ever", email: "test@example.com" }),
    );

    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });
});
