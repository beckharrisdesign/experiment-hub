/**
 * Tests for lib/landing-page/submit.ts — submitLandingPageForm
 *
 * Mocks lib/supabase insertSubmission so no real DB calls are made.
 * Covers: happy path, field mapping, source/slug fallbacks, metadata handling,
 * and error propagation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase", () => ({
  insertSubmission: vi.fn(),
}));

import { submitLandingPageForm } from "@/lib/landing-page/submit";
import { insertSubmission } from "@/lib/supabase";

const mockInsert = vi.mocked(insertSubmission);

const baseSubmission = {
  experimentSlug: "best-day-ever",
  experimentName: "Best Day Ever",
  email: "test@example.com",
  name: "Jordan",
  formData: {},
  timestamp: new Date().toISOString(),
};

describe("submitLandingPageForm", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Happy path
  // ---------------------------------------------------------------------------

  it("returns success:true and the row id on success", async () => {
    mockInsert.mockResolvedValueOnce({ id: "row-uuid-456" });

    const result = await submitLandingPageForm(baseSubmission);

    expect(result).toEqual({ success: true, id: "row-uuid-456" });
  });

  it("calls insertSubmission once", async () => {
    mockInsert.mockResolvedValueOnce({ id: "row-id" });

    await submitLandingPageForm(baseSubmission);

    expect(mockInsert).toHaveBeenCalledOnce();
  });

  // ---------------------------------------------------------------------------
  // Field mapping
  // ---------------------------------------------------------------------------

  it("uses experimentSlug as the experiment identifier", async () => {
    mockInsert.mockResolvedValueOnce({ id: "row-id" });

    await submitLandingPageForm(baseSubmission);

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ experiment: "best-day-ever" }),
    );
  });

  it("falls back to experimentName when experimentSlug is empty", async () => {
    mockInsert.mockResolvedValueOnce({ id: "row-id" });

    await submitLandingPageForm({ ...baseSubmission, experimentSlug: "" });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ experiment: "Best Day Ever" }),
    );
  });

  it("passes email and name through", async () => {
    mockInsert.mockResolvedValueOnce({ id: "row-id" });

    await submitLandingPageForm(baseSubmission);

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ email: "test@example.com", name: "Jordan" }),
    );
  });

  it("uses the provided source when given", async () => {
    mockInsert.mockResolvedValueOnce({ id: "row-id" });

    await submitLandingPageForm({ ...baseSubmission, source: "twitter-ad" });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ source: "twitter-ad" }),
    );
  });

  it("defaults source to 'landing-page' when not provided", async () => {
    mockInsert.mockResolvedValueOnce({ id: "row-id" });

    await submitLandingPageForm({ ...baseSubmission, source: undefined });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ source: "landing-page" }),
    );
  });

  // ---------------------------------------------------------------------------
  // Metadata / formData handling
  // ---------------------------------------------------------------------------

  it("omits metadata when formData is an empty object", async () => {
    mockInsert.mockResolvedValueOnce({ id: "row-id" });

    await submitLandingPageForm({ ...baseSubmission, formData: {} });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: undefined }),
    );
  });

  it("passes formData as metadata when it has entries", async () => {
    mockInsert.mockResolvedValueOnce({ id: "row-id" });

    const formData = { seedCount: "20-50", challenges: ["Buying duplicates"] };
    await submitLandingPageForm({ ...baseSubmission, formData });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: formData }),
    );
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

  it("returns success:false with error message when insertSubmission throws", async () => {
    mockInsert.mockRejectedValueOnce(new Error("connection refused"));

    const result = await submitLandingPageForm(baseSubmission);

    expect(result).toEqual({ success: false, error: "connection refused" });
  });

  it("does not throw — always returns a result object", async () => {
    mockInsert.mockRejectedValueOnce(new Error("unexpected DB error"));

    await expect(submitLandingPageForm(baseSubmission)).resolves.toBeDefined();
  });
});
