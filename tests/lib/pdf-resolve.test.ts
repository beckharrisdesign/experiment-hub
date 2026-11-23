import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getPdfDocument: vi.fn(),
  rpc: vi.fn(),
  getValidAccessToken: vi.fn(),
  getDriveRevision: vi.fn(),
  downloadDriveFile: vi.fn(),
  readEmbeddedMetadata: vi.fn(),
  commitPdfDocument: vi.fn(),
  discardPdfEdits: vi.fn(),
}));

vi.mock("@/lib/pdf-documents", () => ({
  getPdfDocument: mocks.getPdfDocument,
  getPdfAdminClient: () => ({ rpc: mocks.rpc }),
}));
vi.mock("@/lib/pdf-drive", () => ({
  getValidAccessToken: mocks.getValidAccessToken,
  getDriveRevision: mocks.getDriveRevision,
  downloadDriveFile: mocks.downloadDriveFile,
}));
vi.mock("@/lib/pdf-embedded", () => ({ readEmbeddedMetadata: mocks.readEmbeddedMetadata }));
vi.mock("@/lib/pdf-commit", () => ({
  commitPdfDocument: mocks.commitPdfDocument,
  discardPdfEdits: mocks.discardPdfEdits,
}));

import {
  ComparisonStale,
  SameDocumentUnconfirmed,
  UndecidedFields,
  loadComparison,
  resolveConflict,
} from "@/lib/pdf-resolve";
import type { PdfDocument } from "@/lib/pdf-documents";

const ID = "8f2b1c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d";
const BASELINE = { title: "Untitled", subject: null, author: null, keywords: ["invoice"], pageCount: 2 };
const IN_DRIVE = { title: "Theirs", subject: null, author: "City Utilities", keywords: ["invoice"], pageCount: 2 };

function doc(overrides: Partial<PdfDocument> = {}): PdfDocument {
  return {
    id: ID,
    driveFileId: "drive-abc",
    filename: "a.pdf",
    title: "Mine",
    subject: "Utility bill",
    author: null,
    keywords: ["invoice"],
    pageCount: 2,
    hasPendingEdits: true,
    committedAt: null,
    markedForDeletion: false,
    splitNotNeeded: false,
    splitFromDocumentId: null,
    splitIndex: null,
    supersededAt: null,
    driveFolderId: null,
    fileBaseline: BASELINE,
    driveRevisionId: "rev-7",
    attention: null,
    ...overrides,
  };
}

const COMMIT = { status: "committed", document: { id: ID }, changed: 3 };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getPdfDocument.mockResolvedValue(doc());
  mocks.getValidAccessToken.mockResolvedValue("token");
  mocks.getDriveRevision.mockResolvedValue({ revision: "rev-9", modifiedTime: "2026-11-20T20:00:00Z" });
  mocks.downloadDriveFile.mockResolvedValue(new ArrayBuffer(4));
  mocks.readEmbeddedMetadata.mockResolvedValue(IN_DRIVE);
  mocks.rpc.mockResolvedValue({ data: { changed: 1 }, error: null });
  mocks.commitPdfDocument.mockResolvedValue(COMMIT);
});

describe("loadComparison", () => {
  it("reports nothing pending without reading Drive", async () => {
    mocks.getPdfDocument.mockResolvedValue(doc({ hasPendingEdits: false }));
    await expect(loadComparison(ID)).resolves.toMatchObject({ kind: "nothing-pending" });
    expect(mocks.downloadDriveFile).not.toHaveBeenCalled();
  });

  it("reports no conflict when Drive is still at the edits' revision", async () => {
    mocks.getDriveRevision.mockResolvedValue({ revision: "rev-7", modifiedTime: null });
    await expect(loadComparison(ID)).resolves.toMatchObject({ kind: "no-conflict" });
  });

  it("classifies each field and writes nothing (spec: inspecting changes no state)", async () => {
    const result = await loadComparison(ID);
    expect(result).toMatchObject({ kind: "conflict", pages: null });
    if (result?.kind === "conflict") {
      expect(result.fields.map((f) => [f.field, f.state])).toEqual([
        ["title", "conflict"],
        ["subject", "yours"],
        ["author", "drive"],
        ["keywords", "unchanged"],
      ]);
    }
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("raises a changed page count separately from field conflicts", async () => {
    mocks.readEmbeddedMetadata.mockResolvedValue({ ...IN_DRIVE, pageCount: 4 });
    await expect(loadComparison(ID)).resolves.toMatchObject({ pages: { was: 2, now: 4 } });
  });
});

describe("resolveConflict", () => {
  const base = { choices: {}, seenRevision: "rev-9", sameDocument: false };

  it("refuses choices made against a Drive version that has since moved (spec: recomputed)", async () => {
    await expect(
      resolveConflict(ID, { ...base, action: "commit", seenRevision: "rev-8", choices: { title: "yours" } }),
    ).rejects.toBeInstanceOf(ComparisonStale);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("refuses to commit with a conflict left undecided", async () => {
    await expect(resolveConflict(ID, { ...base, action: "commit" })).rejects.toBeInstanceOf(UndecidedFields);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("refuses to commit across a page-count change until it is confirmed as the same document", async () => {
    mocks.readEmbeddedMetadata.mockResolvedValue({ ...IN_DRIVE, pageCount: 4 });
    await expect(
      resolveConflict(ID, { ...base, action: "commit", choices: { title: "yours" } }),
    ).rejects.toBeInstanceOf(SameDocumentUnconfirmed);
    await expect(
      resolveConflict(ID, { ...base, action: "commit", choices: { title: "yours" }, sameDocument: true }),
    ).resolves.toBe(COMMIT);
  });

  it("re-baselines to Drive's version with the settled values, then commits", async () => {
    await resolveConflict(ID, { ...base, action: "commit", choices: { title: "yours" } });
    expect(mocks.rpc).toHaveBeenCalledWith("pdf_rebaseline", {
      doc: ID,
      expected_revision: "rev-7",
      baseline: { revision: "rev-9", embedded: IN_DRIVE },
      vals: { title: "Mine", subject: "Utility bill", author: "City Utilities", keywords: ["invoice"] },
    });
    expect(mocks.commitPdfDocument).toHaveBeenCalledWith(ID);
  });

  it("discarding takes Drive's version and writes nothing to Drive", async () => {
    const result = await resolveConflict(ID, { ...base, action: "discard" });
    expect(result).toMatchObject({ status: "discarded" });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "pdf_rebaseline",
      expect.objectContaining({
        vals: { title: "Theirs", subject: null, author: "City Utilities", keywords: ["invoice"] },
      }),
    );
    expect(mocks.commitPdfDocument).not.toHaveBeenCalled();
  });

  it("reports a document resolved meanwhile as stale", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "40001", message: "moved" } });
    await expect(
      resolveConflict(ID, { ...base, action: "commit", choices: { title: "yours" } }),
    ).rejects.toBeInstanceOf(ComparisonStale);
    expect(mocks.commitPdfDocument).not.toHaveBeenCalled();
  });

  it("falls back to an ordinary commit when the conflict is gone", async () => {
    mocks.getDriveRevision.mockResolvedValue({ revision: "rev-7", modifiedTime: null });
    await expect(resolveConflict(ID, { ...base, action: "commit" })).resolves.toBe(COMMIT);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
