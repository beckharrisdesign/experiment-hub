import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAdminClient = vi.fn();

// Mock the Supabase SDK itself rather than a wrapper. Mocking a wrapper that
// did not exist is what let a broken import pass 11 green tests until tsc
// caught it.
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => mockGetAdminClient(),
}));

import {
  getPdfDocument,
  getPdfDocumentHistory,
  isUuid,
  listPdfDocuments,
} from "@/lib/pdf-documents";

/**
 * Minimal stand-in for the Supabase query builder. Every method returns `this`
 * so a chain resolves, and the terminal shape is whatever the test supplies.
 */
function client(result: { data?: unknown; error?: { message: string } | null }) {
  const builder: Record<string, unknown> = {};
  // `limit` and `range` are stubbed so a test can assert they were NOT used —
  // leaving them off would make that assertion vacuous.
  for (const method of ["select", "eq", "is", "order", "limit", "range"]) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(async () => result);
  builder.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return { from: vi.fn(() => builder), __builder: builder };
}

const ROW = {
  id: "8f2b1c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d",
  drive_file_id: "drive-abc",
  filename: "2026-03-14 — Invoice — Utilities.pdf",
  title: "March electricity invoice",
  subject: "Utility bill",
  author: null,
  keywords: ["invoice", "utilities", "paid"],
  page_count: 2,
  has_pending_edits: true,
  committed_at: null,
  marked_for_deletion: false,
  split_not_needed: false,
  split_from_document_id: null,
  split_index: null,
  superseded_at: null,
};

beforeEach(() => {
  mockGetAdminClient.mockReset();
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
});

// ---------------------------------------------------------------------------
// uuid shape guard
// ---------------------------------------------------------------------------

describe("isUuid", () => {
  it("accepts a well-formed uuid in either case", () => {
    expect(isUuid("8f2b1c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d")).toBe(true);
    expect(isUuid("8F2B1C3D-4E5F-4A6B-8C9D-0E1F2A3B4C5D")).toBe(true);
  });

  it("refuses anything Postgres would raise 22P02 on", () => {
    for (const bad of ["", "abc", "../../etc/passwd", "1; drop table", "8f2b1c3d"]) {
      expect(isUuid(bad), bad).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Listing
// ---------------------------------------------------------------------------

describe("listPdfDocuments", () => {
  it("maps rows to the client shape", async () => {
    mockGetAdminClient.mockReturnValue(client({ data: [ROW], error: null }));
    const docs = await listPdfDocuments();

    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      driveFileId: "drive-abc",
      keywords: ["invoice", "utilities", "paid"],
      hasPendingEdits: true,
      pageCount: 2,
    });
  });

  it("excludes soft-deleted documents", async () => {
    const c = client({ data: [], error: null });
    mockGetAdminClient.mockReturnValue(c);
    await listPdfDocuments();
    expect(c.__builder.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("never selects the bytes or the Drive token columns", async () => {
    const c = client({ data: [], error: null });
    mockGetAdminClient.mockReturnValue(c);
    await listPdfDocuments();
    const selected = (c.__builder.select as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(selected).not.toMatch(/access_token|refresh_token|file_snapshot/);
  });

  it("surfaces a query failure rather than returning an empty archive", async () => {
    mockGetAdminClient.mockReturnValue(
      client({ data: null, error: { message: "connection reset" } }),
    );
    await expect(listPdfDocuments()).rejects.toThrow(/connection reset/);
  });
});

// ---------------------------------------------------------------------------
// Single document
// ---------------------------------------------------------------------------

describe("getPdfDocument", () => {
  it("returns the mapped document", async () => {
    mockGetAdminClient.mockReturnValue(client({ data: ROW, error: null }));
    const doc = await getPdfDocument(ROW.id);
    expect(doc?.title).toBe("March electricity invoice");
  });

  it("returns null when absent, so callers cannot tell absent from deleted", async () => {
    mockGetAdminClient.mockReturnValue(client({ data: null, error: null }));
    await expect(getPdfDocument(ROW.id)).resolves.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

describe("getPdfDocumentHistory", () => {
  const ENTRY = {
    id: 7,
    field: "title",
    old_value: "Untitled",
    new_value: "March electricity invoice",
    change_type: "stage",
    changed_at: "2026-08-06T12:00:00Z",
  };

  it("maps entries and preserves the field-level diff", async () => {
    mockGetAdminClient.mockReturnValue(client({ data: [ENTRY], error: null }));
    const [entry] = await getPdfDocumentHistory(ROW.id);
    expect(entry).toEqual({
      id: 7,
      field: "title",
      oldValue: "Untitled",
      newValue: "March electricity invoice",
      changeType: "stage",
      changedAt: "2026-08-06T12:00:00Z",
    });
  });

  it("orders newest first", async () => {
    const c = client({ data: [], error: null });
    mockGetAdminClient.mockReturnValue(c);
    await getPdfDocumentHistory(ROW.id);
    expect(c.__builder.order).toHaveBeenCalledWith("changed_at", {
      ascending: false,
    });
  });

  it("applies no row limit — history is uncapped, unlike v1's 1000", async () => {
    const c = client({ data: [], error: null });
    mockGetAdminClient.mockReturnValue(c);
    await getPdfDocumentHistory(ROW.id);
    expect(c.__builder.limit).not.toHaveBeenCalled();
    expect(c.__builder.range).not.toHaveBeenCalled();
  });

  it("scopes to the requested document", async () => {
    const c = client({ data: [], error: null });
    mockGetAdminClient.mockReturnValue(c);
    await getPdfDocumentHistory(ROW.id);
    expect(c.__builder.eq).toHaveBeenCalledWith("document_id", ROW.id);
  });
});
