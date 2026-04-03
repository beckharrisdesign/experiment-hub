/**
 * Tests for lib/supabase.ts — insertSubmission
 *
 * Mocks the @supabase/supabase-js createClient so no real network calls are made.
 * Covers: happy path, missing env vars, Supabase errors, and field mapping.
 *
 * vi.hoisted() is required here because vi.mock factories are hoisted above
 * variable declarations, causing TDZ errors when the factory references
 * top-level const variables.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Build chainable mock handles via vi.hoisted so they're available in the factory.
const { mockSingle, mockSelect, mockInsert, mockFrom, mockCreateClient } =
  vi.hoisted(() => {
    const mockSingle = vi.fn();
    const mockSelect = vi.fn(() => ({ single: mockSingle }));
    const mockInsert = vi.fn(() => ({ select: mockSelect }));
    const mockFrom = vi.fn(() => ({ insert: mockInsert }));
    const mockCreateClient = vi.fn(() => ({ from: mockFrom }));
    return { mockSingle, mockSelect, mockInsert, mockFrom, mockCreateClient };
  });

vi.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

import { insertSubmission } from "@/lib/supabase";

describe("insertSubmission", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");

    // Re-wire the chain after any clearAllMocks
    mockSingle.mockResolvedValue({ data: null, error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ insert: mockInsert });
    mockCreateClient.mockReturnValue({ from: mockFrom });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Happy path
  // ---------------------------------------------------------------------------

  it("returns the inserted row id on success", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { id: "uuid-abc-123" },
      error: null,
    });

    const result = await insertSubmission({
      experiment: "best-day-ever",
      email: "test@example.com",
    });

    expect(result).toEqual({ id: "uuid-abc-123" });
  });

  it("inserts into the experiment_submissions table", async () => {
    mockSingle.mockResolvedValueOnce({ data: { id: "row-id" }, error: null });

    await insertSubmission({
      experiment: "best-day-ever",
      email: "test@example.com",
    });

    expect(mockFrom).toHaveBeenCalledWith("experiment_submissions");
  });

  it("passes all provided fields to the insert call", async () => {
    mockSingle.mockResolvedValueOnce({ data: { id: "row-id" }, error: null });

    await insertSubmission({
      experiment: "seed-organizer",
      email: "user@example.com",
      name: "Taylor",
      source: "facebook-ad",
      notes: "Saw an ad",
      metadata: { seedCount: "20-50" },
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        experiment: "seed-organizer",
        email: "user@example.com",
        name: "Taylor",
        source: "facebook-ad",
        notes: "Saw an ad",
        metadata: { seedCount: "20-50" },
      }),
    );
  });

  it("defaults name, notes, and metadata to null when omitted", async () => {
    mockSingle.mockResolvedValueOnce({ data: { id: "row-id" }, error: null });

    await insertSubmission({
      experiment: "best-day-ever",
      email: "test@example.com",
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: null,
        notes: null,
        metadata: null,
      }),
    );
  });

  it("defaults source to 'landing-page' when omitted", async () => {
    mockSingle.mockResolvedValueOnce({ data: { id: "row-id" }, error: null });

    await insertSubmission({
      experiment: "best-day-ever",
      email: "test@example.com",
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ source: "landing-page" }),
    );
  });

  // ---------------------------------------------------------------------------
  // Missing env vars
  // ---------------------------------------------------------------------------

  it("throws when SUPABASE_URL is not set", async () => {
    vi.unstubAllEnvs();
    delete process.env.SUPABASE_URL;
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "some-key");

    await expect(
      insertSubmission({ experiment: "test", email: "test@example.com" }),
    ).rejects.toThrow("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  });

  it("throws when SUPABASE_SERVICE_ROLE_KEY is not set", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    await expect(
      insertSubmission({ experiment: "test", email: "test@example.com" }),
    ).rejects.toThrow("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  });

  // ---------------------------------------------------------------------------
  // Supabase errors
  // ---------------------------------------------------------------------------

  it("throws the Supabase error when the insert fails", async () => {
    const dbError = { message: "duplicate key value", code: "23505" };
    mockSingle.mockResolvedValueOnce({ data: null, error: dbError });

    await expect(
      insertSubmission({
        experiment: "best-day-ever",
        email: "test@example.com",
      }),
    ).rejects.toMatchObject({ message: "duplicate key value" });
  });

  it("throws when the client call rejects (network error)", async () => {
    mockSingle.mockRejectedValueOnce(new Error("network timeout"));

    await expect(
      insertSubmission({
        experiment: "best-day-ever",
        email: "test@example.com",
      }),
    ).rejects.toThrow("network timeout");
  });
});
