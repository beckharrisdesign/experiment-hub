import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockFrom, mockCreateClient } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  const mockCreateClient = vi.fn(() => ({ from: mockFrom }));
  return { mockFrom, mockCreateClient };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

import { getNotes, createNote, updateNote, deleteNote } from "@/lib/supabase";

const NOTE = {
  id: "uuid-1",
  experiment_id: "etsy-listing-manager",
  title: "First note",
  content: "Some content",
  note_type: "observation" as const,
  source_file: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
  mockCreateClient.mockReturnValue({ from: mockFrom });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getNotes
// ---------------------------------------------------------------------------

describe("getNotes", () => {
  function setupChain(result: { data: unknown; error: unknown }) {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve(result),
        }),
      }),
    });
  }

  it("returns notes ordered by created_at desc", async () => {
    setupChain({ data: [NOTE], error: null });
    const result = await getNotes("etsy-listing-manager");
    expect(result).toEqual([NOTE]);
    expect(mockFrom).toHaveBeenCalledWith("notes");
  });

  it("returns empty array when no notes exist", async () => {
    setupChain({ data: [], error: null });
    expect(await getNotes("etsy-listing-manager")).toEqual([]);
  });

  it("returns empty array when data is null", async () => {
    setupChain({ data: null, error: null });
    expect(await getNotes("etsy-listing-manager")).toEqual([]);
  });

  it("throws on Supabase error", async () => {
    setupChain({ data: null, error: { message: "relation not found" } });
    await expect(getNotes("etsy-listing-manager")).rejects.toMatchObject({
      message: "relation not found",
    });
  });

  it("throws when SUPABASE_SERVICE_ROLE_KEY is not set", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    await expect(getNotes("etsy-listing-manager")).rejects.toThrow(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set",
    );
  });
});

// ---------------------------------------------------------------------------
// createNote
// ---------------------------------------------------------------------------

describe("createNote", () => {
  function setupChain(result: { data: unknown; error: unknown }) {
    mockFrom.mockReturnValue({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve(result),
        }),
      }),
    });
  }

  it("returns the created note", async () => {
    setupChain({ data: NOTE, error: null });
    const result = await createNote("etsy-listing-manager", {
      content: "Some content",
      title: "First note",
    });
    expect(result).toEqual(NOTE);
    expect(mockFrom).toHaveBeenCalledWith("notes");
  });

  it("defaults note_type to observation", async () => {
    const mockInsert = vi.fn(() => ({
      select: () => ({
        single: () => Promise.resolve({ data: NOTE, error: null }),
      }),
    }));
    mockFrom.mockReturnValue({ insert: mockInsert });

    await createNote("etsy-listing-manager", { content: "test" });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ note_type: "observation" }),
    );
  });

  it("accepts null for title and source_file", async () => {
    const mockInsert = vi.fn(() => ({
      select: () => ({
        single: () => Promise.resolve({ data: NOTE, error: null }),
      }),
    }));
    mockFrom.mockReturnValue({ insert: mockInsert });

    await createNote("etsy-listing-manager", {
      content: "test",
      title: null,
      source_file: null,
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ title: null, source_file: null }),
    );
  });

  it("passes created_at when provided (backdating)", async () => {
    const mockInsert = vi.fn(() => ({
      select: () => ({
        single: () => Promise.resolve({ data: NOTE, error: null }),
      }),
    }));
    mockFrom.mockReturnValue({ insert: mockInsert });

    await createNote("etsy-listing-manager", {
      content: "test",
      created_at: "2025-05-08T00:00:00Z",
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ created_at: "2025-05-08T00:00:00Z" }),
    );
  });

  it("throws on Supabase error", async () => {
    setupChain({ data: null, error: { message: "insert failed" } });
    await expect(
      createNote("etsy-listing-manager", { content: "test" }),
    ).rejects.toMatchObject({ message: "insert failed" });
  });
});

// ---------------------------------------------------------------------------
// updateNote
// ---------------------------------------------------------------------------

describe("updateNote", () => {
  function setupChain(result: { data: unknown; error: unknown }) {
    mockFrom.mockReturnValue({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve(result),
          }),
        }),
      }),
    });
  }

  it("returns the updated note", async () => {
    setupChain({ data: { ...NOTE, content: "Updated" }, error: null });
    const result = await updateNote("uuid-1", { content: "Updated" });
    expect(result).toMatchObject({ content: "Updated" });
    expect(mockFrom).toHaveBeenCalledWith("notes");
  });

  it("throws on Supabase error", async () => {
    setupChain({ data: null, error: { message: "row not found" } });
    await expect(updateNote("uuid-1", { content: "x" })).rejects.toMatchObject({
      message: "row not found",
    });
  });
});

// ---------------------------------------------------------------------------
// deleteNote
// ---------------------------------------------------------------------------

describe("deleteNote", () => {
  function setupChain(result: { data: unknown; error: unknown }) {
    mockFrom.mockReturnValue({
      delete: () => ({
        eq: () => Promise.resolve(result),
      }),
    });
  }

  it("resolves without error on success", async () => {
    setupChain({ data: null, error: null });
    await expect(deleteNote("uuid-1")).resolves.toBeUndefined();
    expect(mockFrom).toHaveBeenCalledWith("notes");
  });

  it("throws on Supabase error", async () => {
    setupChain({ data: null, error: { message: "delete failed" } });
    await expect(deleteNote("uuid-1")).rejects.toMatchObject({
      message: "delete failed",
    });
  });
});
