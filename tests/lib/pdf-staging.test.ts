import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getPdfDocument: vi.fn(),
  rpc: vi.fn(),
  getValidAccessToken: vi.fn(),
  getDriveHeadRevisionId: vi.fn(),
  downloadDriveFile: vi.fn(),
  readEmbeddedMetadata: vi.fn(),
}));

vi.mock("@/lib/pdf-documents", () => ({
  getPdfDocument: mocks.getPdfDocument,
  getPdfAdminClient: () => ({ rpc: mocks.rpc }),
}));
vi.mock("@/lib/pdf-drive", () => ({
  getValidAccessToken: mocks.getValidAccessToken,
  getDriveHeadRevisionId: mocks.getDriveHeadRevisionId,
  downloadDriveFile: mocks.downloadDriveFile,
}));
vi.mock("@/lib/pdf-embedded", () => ({
  readEmbeddedMetadata: mocks.readEmbeddedMetadata,
}));

import {
  DriveFileUnstable,
  parseEdits,
  readBaseline,
  stagePdfEdits,
  summarizePending,
} from "@/lib/pdf-staging";
import type { PdfDocument } from "@/lib/pdf-documents";
import { DocumentReplaced } from "@/lib/pdf-split-plan";

const ID = "8f2b1c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d";
const EMBEDDED = {
  title: "Untitled",
  subject: null,
  author: null,
  keywords: ["invoice"],
  pageCount: 2,
};

function doc(overrides: Partial<PdfDocument> = {}): PdfDocument {
  return {
    id: ID,
    driveFileId: "drive-abc",
    filename: "a.pdf",
    title: null,
    subject: null,
    author: null,
    keywords: [],
    pageCount: null,
    hasPendingEdits: false,
    committedAt: null,
    markedForDeletion: false,
    splitNotNeeded: false,
    splitFromDocumentId: null,
    splitIndex: null,
    supersededAt: null,
    driveFolderId: null,
    fileBaseline: null,
    driveRevisionId: null,
    attention: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getValidAccessToken.mockResolvedValue("token");
  mocks.downloadDriveFile.mockResolvedValue(new ArrayBuffer(4));
  mocks.readEmbeddedMetadata.mockResolvedValue(EMBEDDED);
  mocks.rpc.mockResolvedValue({ data: { changed: 1 }, error: null });
});

// ---------------------------------------------------------------------------
// parseEdits
// ---------------------------------------------------------------------------

describe("parseEdits", () => {
  it("refuses a body that is not an object", () => {
    expect(parseEdits(null).ok).toBe(false);
    expect(parseEdits([]).ok).toBe(false);
    expect(parseEdits("title").ok).toBe(false);
  });

  it("refuses an unknown field rather than ignoring it", () => {
    expect(parseEdits({ filename: "x.pdf" })).toEqual({
      ok: false,
      error: "Unknown field: filename",
    });
  });

  it("refuses an empty change", () => {
    expect(parseEdits({}).ok).toBe(false);
  });

  it("trims text, and an empty string clears the field", () => {
    expect(parseEdits({ title: "  March invoice ", subject: "   ", author: null })).toEqual({
      ok: true,
      edits: { title: "March invoice", subject: null, author: null },
    });
  });

  it("refuses text that is not a string", () => {
    expect(parseEdits({ title: 42 }).ok).toBe(false);
  });

  it("refuses a keyword containing whitespace and suggests the hyphenated form", () => {
    const result = parseEdits({ keywords: ["invoice", "year 2026"] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('"year 2026"');
      expect(result.error).toContain("year-2026");
    }
  });

  it("trims, drops empties, and de-duplicates keywords in order", () => {
    expect(parseEdits({ keywords: [" paid", "invoice", "", "paid"] })).toEqual({
      ok: true,
      edits: { keywords: ["paid", "invoice"] },
    });
  });

  it("allows clearing every keyword", () => {
    expect(parseEdits({ keywords: [] })).toEqual({ ok: true, edits: { keywords: [] } });
  });

  it("refuses keywords that are not a list of text", () => {
    expect(parseEdits({ keywords: "invoice paid" }).ok).toBe(false);
    expect(parseEdits({ keywords: ["invoice", 3] }).ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// readBaseline
// ---------------------------------------------------------------------------

describe("readBaseline", () => {
  it("pins the file's metadata to the revision read around the bytes", async () => {
    mocks.getDriveHeadRevisionId.mockResolvedValue("rev-7");
    await expect(readBaseline("drive-abc")).resolves.toEqual({
      revision: "rev-7",
      embedded: EMBEDDED,
    });
    expect(mocks.downloadDriveFile).toHaveBeenCalledTimes(1);
  });

  it("reads again when the file changed mid-read", async () => {
    mocks.getDriveHeadRevisionId
      .mockResolvedValueOnce("rev-7")
      .mockResolvedValueOnce("rev-8")
      .mockResolvedValueOnce("rev-8")
      .mockResolvedValueOnce("rev-8");
    await expect(readBaseline("drive-abc")).resolves.toMatchObject({ revision: "rev-8" });
    expect(mocks.downloadDriveFile).toHaveBeenCalledTimes(2);
  });

  it("gives up when the file never holds still", async () => {
    let n = 0;
    mocks.getDriveHeadRevisionId.mockImplementation(async () => `rev-${n++}`);
    await expect(readBaseline("drive-abc")).rejects.toBeInstanceOf(DriveFileUnstable);
  });
});

// ---------------------------------------------------------------------------
// stagePdfEdits
// ---------------------------------------------------------------------------

describe("stagePdfEdits", () => {
  it("returns null for a document that does not exist", async () => {
    mocks.getPdfDocument.mockResolvedValue(null);
    await expect(stagePdfEdits(ID, { title: "x" })).resolves.toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("captures the baseline on the first edit", async () => {
    mocks.getDriveHeadRevisionId.mockResolvedValue("rev-7");
    mocks.getPdfDocument.mockResolvedValue(doc());
    await stagePdfEdits(ID, { title: "March invoice" });
    expect(mocks.rpc).toHaveBeenCalledWith("pdf_stage_edits", {
      doc: ID,
      edits: { title: "March invoice" },
      baseline: { revision: "rev-7", embedded: EMBEDDED },
    });
  });

  it("never re-reads the file while edits are pending", async () => {
    mocks.getPdfDocument.mockResolvedValue(doc({ hasPendingEdits: true }));
    await stagePdfEdits(ID, { title: "March invoice" });
    expect(mocks.downloadDriveFile).not.toHaveBeenCalled();
    expect(mocks.getDriveHeadRevisionId).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith("pdf_stage_edits", {
      doc: ID,
      edits: { title: "March invoice" },
      baseline: null,
    });
  });

  it("returns the document as it reads after staging", async () => {
    const after = doc({ hasPendingEdits: true, title: "March invoice" });
    mocks.getPdfDocument
      .mockResolvedValueOnce(doc({ hasPendingEdits: true }))
      .mockResolvedValueOnce(after);
    await expect(stagePdfEdits(ID, { title: "March invoice" })).resolves.toBe(after);
  });

  it("treats a document deleted mid-request as not found", async () => {
    mocks.getPdfDocument.mockResolvedValue(doc({ hasPendingEdits: true }));
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "P0002", message: "not found" } });
    await expect(stagePdfEdits(ID, { title: "x" })).resolves.toBeNull();
  });

  it("surfaces any other database error", async () => {
    mocks.getPdfDocument.mockResolvedValue(doc({ hasPendingEdits: true }));
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "23514", message: "check violated" } });
    await expect(stagePdfEdits(ID, { title: "x" })).rejects.toThrow(/check violated/);
  });
});

// ---------------------------------------------------------------------------
// summarizePending
// ---------------------------------------------------------------------------

describe("summarizePending", () => {
  it("reports nothing for a document never edited", () => {
    expect(summarizePending(doc({ title: "anything" })).count).toBe(0);
  });

  it("counts edited fields and each keyword added or removed", () => {
    const summary = summarizePending(
      doc({
        fileBaseline: EMBEDDED,
        title: "March invoice",
        subject: "Utility bill",
        author: null,
        keywords: ["utilities", "paid"],
      }),
    );
    expect(summary).toEqual({
      fields: ["title", "subject"],
      keywordsAdded: ["utilities", "paid"],
      keywordsRemoved: ["invoice"],
      count: 5,
    });
  });

  it("reports nothing once values match the file again", () => {
    expect(
      summarizePending(
        doc({ fileBaseline: EMBEDDED, title: "Untitled", keywords: ["invoice"] }),
      ).count,
    ).toBe(0);
  });
});

describe("stagePdfEdits on a split original", () => {
  it("refuses, saving nothing and reading nothing from Drive", async () => {
    mocks.getPdfDocument.mockResolvedValue(doc({ supersededAt: "2026-11-23T23:00:00Z" }));
    await expect(stagePdfEdits(ID, { title: "x" })).rejects.toBeInstanceOf(DocumentReplaced);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.getValidAccessToken).not.toHaveBeenCalled();
  });
});
