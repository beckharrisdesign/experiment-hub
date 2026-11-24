import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getPdfDocument: vi.fn(),
  rpc: vi.fn(),
  getValidAccessToken: vi.fn(),
  getDriveHeadRevisionId: vi.fn(),
  downloadDriveFile: vi.fn(),
  uploadDriveFile: vi.fn(),
  readEmbeddedMetadata: vi.fn(),
  writeEmbeddedMetadata: vi.fn(),
  stagePdfEdits: vi.fn(),
  recordAttention: vi.fn(),
  clearAttention: vi.fn(),
}));

vi.mock("@/lib/pdf-documents", () => ({
  getPdfDocument: mocks.getPdfDocument,
  getPdfAdminClient: () => ({ rpc: mocks.rpc }),
}));
vi.mock("@/lib/pdf-drive", () => ({
  getValidAccessToken: mocks.getValidAccessToken,
  getDriveHeadRevisionId: mocks.getDriveHeadRevisionId,
  downloadDriveFile: mocks.downloadDriveFile,
  uploadDriveFile: mocks.uploadDriveFile,
}));
vi.mock("@/lib/pdf-embedded", () => ({
  readEmbeddedMetadata: mocks.readEmbeddedMetadata,
  writeEmbeddedMetadata: mocks.writeEmbeddedMetadata,
}));
vi.mock("@/lib/pdf-staging", () => ({ stagePdfEdits: mocks.stagePdfEdits }));
vi.mock("@/lib/pdf-attention", () => ({
  recordAttention: mocks.recordAttention,
  clearAttention: mocks.clearAttention,
}));

import {
  CommitConflict,
  CommitNotRecorded,
  commitPdfDocument,
  discardPdfEdits,
} from "@/lib/pdf-commit";
import type { PdfDocument } from "@/lib/pdf-documents";
import { DocumentReplaced } from "@/lib/pdf-split-plan";

const ID = "8f2b1c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d";
const BASELINE = { title: "Untitled", subject: null, author: null, keywords: ["invoice"], pageCount: 2 };
const WRITTEN = new Uint8Array([1, 2, 3]);
const READ_BACK = { title: "March", subject: null, author: null, keywords: ["invoice", "paid"], pageCount: 2 };

function doc(overrides: Partial<PdfDocument> = {}): PdfDocument {
  return {
    id: ID,
    driveFileId: "drive-abc",
    filename: "a.pdf",
    title: "March",
    subject: null,
    author: null,
    keywords: ["invoice", "paid"],
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
    fileRead: null,
    attention: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getPdfDocument.mockResolvedValue(doc());
  mocks.getValidAccessToken.mockResolvedValue("token");
  mocks.getDriveHeadRevisionId.mockResolvedValue("rev-7");
  mocks.downloadDriveFile.mockResolvedValue(new ArrayBuffer(4));
  mocks.writeEmbeddedMetadata.mockResolvedValue(WRITTEN);
  mocks.uploadDriveFile.mockResolvedValue("rev-8");
  mocks.readEmbeddedMetadata.mockResolvedValue(READ_BACK);
  mocks.rpc.mockResolvedValue({ data: { changed: 2 }, error: null });
});

describe("commitPdfDocument", () => {
  it("returns null for a document that does not exist", async () => {
    mocks.getPdfDocument.mockResolvedValue(null);
    await expect(commitPdfDocument(ID)).resolves.toBeNull();
    expect(mocks.getValidAccessToken).not.toHaveBeenCalled();
  });

  it("refuses a split original before touching Drive, and raises no attention card", async () => {
    mocks.getPdfDocument.mockResolvedValue(doc({ supersededAt: "2026-11-23T23:00:00Z" }));
    await expect(commitPdfDocument(ID)).rejects.toBeInstanceOf(DocumentReplaced);
    expect(mocks.getValidAccessToken).not.toHaveBeenCalled();
    expect(mocks.uploadDriveFile).not.toHaveBeenCalled();
    expect(mocks.recordAttention).not.toHaveBeenCalled();
  });

  it("makes no write when nothing is pending (spec)", async () => {
    mocks.getPdfDocument.mockResolvedValue(doc({ hasPendingEdits: false }));
    await expect(commitPdfDocument(ID)).resolves.toMatchObject({ status: "nothing-pending" });
    expect(mocks.downloadDriveFile).not.toHaveBeenCalled();
    expect(mocks.uploadDriveFile).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("writes the staged values, uploads to the same file, and records the read-back", async () => {
    const result = await commitPdfDocument(ID);
    expect(result).toMatchObject({ status: "committed", changed: 2 });
    expect(mocks.writeEmbeddedMetadata).toHaveBeenCalledWith(expect.any(ArrayBuffer), {
      title: "March",
      subject: null,
      author: null,
      keywords: ["invoice", "paid"],
    });
    expect(mocks.uploadDriveFile).toHaveBeenCalledWith("token", "drive-abc", WRITTEN);
    expect(mocks.readEmbeddedMetadata).toHaveBeenCalledWith(WRITTEN);
    expect(mocks.rpc).toHaveBeenCalledWith("pdf_record_commit", {
      doc: ID,
      expected_revision: "rev-7",
      new_revision: "rev-8",
      embedded: READ_BACK,
    });
  });

  it("stops before downloading when the file changed in Drive since editing started", async () => {
    mocks.getDriveHeadRevisionId.mockResolvedValue("rev-other");
    await expect(commitPdfDocument(ID)).rejects.toBeInstanceOf(CommitConflict);
    expect(mocks.downloadDriveFile).not.toHaveBeenCalled();
    expect(mocks.uploadDriveFile).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("stops before writing when the file changed during the download", async () => {
    mocks.getDriveHeadRevisionId.mockResolvedValueOnce("rev-7").mockResolvedValueOnce("rev-other");
    await expect(commitPdfDocument(ID)).rejects.toBeInstanceOf(CommitConflict);
    expect(mocks.uploadDriveFile).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("leaves the record untouched when the upload fails (spec: edits survive)", async () => {
    mocks.uploadDriveFile.mockRejectedValue(new Error("Drive could not upload the file (500)"));
    await expect(commitPdfDocument(ID)).rejects.toThrow(/500/);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("leaves the record untouched when the file cannot be rewritten", async () => {
    mocks.writeEmbeddedMetadata.mockRejectedValue(new Error("encrypted"));
    await expect(commitPdfDocument(ID)).rejects.toThrow(/encrypted/);
    expect(mocks.uploadDriveFile).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("says so when the file was written but could not be recorded", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "40001", message: "moved" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(commitPdfDocument(ID)).rejects.toBeInstanceOf(CommitNotRecorded);
  });
});

describe("Needs attention (task 8.8)", () => {
  it("clears the document's instance when a commit succeeds", async () => {
    await commitPdfDocument(ID);
    expect(mocks.clearAttention).toHaveBeenCalledWith(ID);
    expect(mocks.recordAttention).not.toHaveBeenCalled();
  });

  it("records a failure against the document, then still reports it", async () => {
    mocks.getDriveHeadRevisionId.mockResolvedValue("rev-other");
    await expect(commitPdfDocument(ID)).rejects.toBeInstanceOf(CommitConflict);
    expect(mocks.recordAttention).toHaveBeenCalledWith(ID, expect.any(CommitConflict));
    expect(mocks.clearAttention).not.toHaveBeenCalled();
  });

  it("leaves an instance alone when there was nothing to write", async () => {
    mocks.getPdfDocument.mockResolvedValue(doc({ hasPendingEdits: false }));
    await commitPdfDocument(ID);
    expect(mocks.clearAttention).not.toHaveBeenCalled();
  });

  it("clears it on discard, since nothing is left to write", async () => {
    mocks.stagePdfEdits.mockResolvedValue(doc({ hasPendingEdits: false }));
    await discardPdfEdits(ID);
    expect(mocks.clearAttention).toHaveBeenCalledWith(ID);
  });
});

describe("discardPdfEdits", () => {
  it("returns null for a document that does not exist", async () => {
    mocks.getPdfDocument.mockResolvedValue(null);
    await expect(discardPdfEdits(ID)).resolves.toBeNull();
  });

  it("does nothing when nothing is pending", async () => {
    const quiet = doc({ hasPendingEdits: false });
    mocks.getPdfDocument.mockResolvedValue(quiet);
    await expect(discardPdfEdits(ID)).resolves.toBe(quiet);
    expect(mocks.stagePdfEdits).not.toHaveBeenCalled();
  });

  it("stages every field back to the baseline, touching no Drive file", async () => {
    mocks.stagePdfEdits.mockResolvedValue(doc({ hasPendingEdits: false }));
    await discardPdfEdits(ID);
    expect(mocks.stagePdfEdits).toHaveBeenCalledWith(ID, {
      title: "Untitled",
      subject: null,
      author: null,
      keywords: ["invoice"],
    });
    expect(mocks.uploadDriveFile).not.toHaveBeenCalled();
  });
});
