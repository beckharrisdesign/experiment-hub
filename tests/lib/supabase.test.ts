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
// mockSelect/mockSingle exist only to PROVE they are never called: the table is
// write-only for the publishable role (INSERT policy, no SELECT policy), so a
// returning `.select()` is denied by RLS with 42501 — the 2026-08-17 prod bug.
const { mockSingle, mockSelect, mockInsert, mockFrom, mockCreateClient } =
  vi.hoisted(() => {
    const mockSingle = vi.fn();
    const mockSelect = vi.fn(() => ({ single: mockSingle }));
    const mockInsert = vi.fn(async () => ({ error: null }));
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
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");

    // Re-wire the chain after any clearAllMocks
    mockSingle.mockResolvedValue({ data: null, error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockInsert.mockResolvedValue({ error: null });
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

  it("returns a generated id that is also sent in the insert", async () => {
    const result = await insertSubmission({
      experiment: "best-day-ever",
      email: "test@example.com",
    });

    // Pre-generated client-side, not read back from the database.
    expect(result.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: result.id }),
    );
  });

  it("never reads the row back — the table is write-only under RLS", async () => {
    await insertSubmission({
      experiment: "best-day-ever",
      email: "test@example.com",
    });

    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockSingle).not.toHaveBeenCalled();
  });

  it("inserts into the experiment_submissions table", async () => {
    await insertSubmission({
      experiment: "best-day-ever",
      email: "test@example.com",
    });

    expect(mockFrom).toHaveBeenCalledWith("experiment_submissions");
  });

  it("passes all provided fields to the insert call", async () => {
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
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "some-key");

    await expect(
      insertSubmission({ experiment: "test", email: "test@example.com" }),
    ).rejects.toThrow("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set");
  });

  it("throws when SUPABASE_PUBLISHABLE_KEY is not set", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
    delete process.env.SUPABASE_PUBLISHABLE_KEY;

    await expect(
      insertSubmission({ experiment: "test", email: "test@example.com" }),
    ).rejects.toThrow("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set");
  });

  // ---------------------------------------------------------------------------
  // Supabase errors
  // ---------------------------------------------------------------------------

  it("throws the Supabase error when the insert fails", async () => {
    const dbError = { message: "duplicate key value", code: "23505" };
    mockInsert.mockResolvedValueOnce({ error: dbError });

    await expect(
      insertSubmission({
        experiment: "best-day-ever",
        email: "test@example.com",
      }),
    ).rejects.toMatchObject({ message: "duplicate key value" });
  });

  it("throws when the client call rejects (network error)", async () => {
    mockInsert.mockRejectedValueOnce(new Error("network timeout"));

    await expect(
      insertSubmission({
        experiment: "best-day-ever",
        email: "test@example.com",
      }),
    ).rejects.toThrow("network timeout");
  });
});
