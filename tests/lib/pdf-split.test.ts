import { describe, it, expect, vi, beforeEach } from "vitest";
import { PDFDocument } from "pdf-lib";

const mocks = vi.hoisted(() => ({
  getPdfDocument: vi.fn(),
  rpc: vi.fn(),
  getValidAccessToken: vi.fn(),
  getDriveHeadRevisionId: vi.fn(),
  downloadDriveFile: vi.fn(),
  getDriveParent: vi.fn(),
  createDriveFile: vi.fn(),
  trashDriveFile: vi.fn(),
}));

vi.mock("@/lib/pdf-documents", () => ({
  getPdfDocument: mocks.getPdfDocument,
  getPdfAdminClient: () => ({ rpc: mocks.rpc }),
}));
vi.mock("@/lib/pdf-drive", () => ({
  getValidAccessToken: mocks.getValidAccessToken,
  getDriveHeadRevisionId: mocks.getDriveHeadRevisionId,
  downloadDriveFile: mocks.downloadDriveFile,
  getDriveParent: mocks.getDriveParent,
  createDriveFile: mocks.createDriveFile,
  trashDriveFile: mocks.trashDriveFile,
}));

import {
  AlreadySplit,
  InvalidSplit,
  SplitConflict,
  SplitNotRecorded,
  partName,
  planParts,
  splitPdfDocument,
} from "@/lib/pdf-split";

const ID = "8f2b1c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d";

async function pdfOf(pages: number): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([200 + i, 300]);
  const bytes = await doc.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function doc(overrides: Record<string, unknown> = {}) {
  return {
    id: ID,
    driveFileId: "drive-orig",
    filename: "04272025_Scan.pdf",
    title: "Groceries",
    subject: null,
    author: null,
    keywords: ["receipt", "grocery"],
    driveFolderId: "folder-1",
    driveRevisionId: "rev-1",
    fileBaseline: null,
    supersededAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  for (const m of Object.values(mocks)) m.mockReset();
  mocks.getValidAccessToken.mockResolvedValue("token");
  mocks.getDriveHeadRevisionId.mockResolvedValue("rev-1");
  let n = 0;
  mocks.createDriveFile.mockImplementation(async () => {
    n += 1;
    return { id: `drive-part-${n}`, revision: `r-${n}` };
  });
  mocks.trashDriveFile.mockResolvedValue(undefined);
  mocks.rpc.mockResolvedValue({ data: { outputs: ["a", "b", "c"] }, error: null });
});

describe("planParts", () => {
  it("turns 'split after' pages into inclusive page ranges", () => {
    expect(planParts(6, [2, 5])).toEqual([[1, 2], [3, 5], [6, 6]]);
  });

  it("ignores order and repeats", () => {
    expect(planParts(6, [5, 2, 2])).toEqual([[1, 2], [3, 5], [6, 6]]);
  });

  it("refuses breaks outside the document, none at all, or a one-page document", () => {
    expect(() => planParts(6, [0])).toThrow(InvalidSplit);
    expect(() => planParts(6, [6])).toThrow(InvalidSplit);
    expect(() => planParts(6, [1.5])).toThrow(InvalidSplit);
    expect(() => planParts(6, [])).toThrow(InvalidSplit);
    expect(() => planParts(1, [1])).toThrow(InvalidSplit);
  });
});

describe("partName", () => {
  it("numbers parts as v1 did", () => {
    expect(partName("04272025_Scan.pdf", 1)).toBe("04272025_Scan-001.pdf");
    expect(partName("Report.PDF", 12)).toBe("Report-012.pdf");
    expect(partName(null, 2)).toBe("document-002.pdf");
  });
});

describe("splitPdfDocument", () => {
  it("creates one Drive file per part beside the original, carrying its values", async () => {
    mocks.getPdfDocument.mockResolvedValue(doc());
    mocks.downloadDriveFile.mockResolvedValue(await pdfOf(6));

    const result = await splitPdfDocument(ID, [2, 5]);

    expect(result).toEqual({ outputs: ["a", "b", "c"] });
    expect(mocks.createDriveFile).toHaveBeenCalledTimes(3);
    const calls = mocks.createDriveFile.mock.calls.map(([, f]) => f);
    expect(calls.map((f) => f.name)).toEqual([
      "04272025_Scan-001.pdf",
      "04272025_Scan-002.pdf",
      "04272025_Scan-003.pdf",
    ]);
    expect(calls.every((f) => f.parentId === "folder-1")).toBe(true);

    // The middle part holds pages 3–5 of the original, and the values (7b.3).
    const middle = await PDFDocument.load(calls[1].bytes, { updateMetadata: false });
    expect(middle.getPageCount()).toBe(3);
    expect(middle.getPage(0).getWidth()).toBe(202);
    expect(middle.getTitle()).toBe("Groceries");
    expect(middle.getKeywords()).toBe("receipt grocery");

    const [fn, args] = mocks.rpc.mock.calls[0];
    expect(fn).toBe("pdf_record_split");
    expect(args.doc).toBe(ID);
    expect(args.expected_revision).toBe("rev-1");
    expect(args.outputs.map((o: { index: number; embedded: { pageCount: number } }) => [o.index, o.embedded.pageCount])).toEqual([
      [1, 2],
      [2, 3],
      [3, 1],
    ]);
  });

  it("finds the folder in Drive for a document imported before folders were recorded", async () => {
    mocks.getPdfDocument.mockResolvedValue(doc({ driveFolderId: null }));
    mocks.downloadDriveFile.mockResolvedValue(await pdfOf(2));
    mocks.getDriveParent.mockResolvedValue("folder-from-drive");
    await splitPdfDocument(ID, [1]);
    expect(mocks.createDriveFile.mock.calls[0][1].parentId).toBe("folder-from-drive");
  });

  it("refuses a document that was already split, touching nothing", async () => {
    mocks.getPdfDocument.mockResolvedValue(doc({ supersededAt: "2026-11-23T00:00:00Z" }));
    await expect(splitPdfDocument(ID, [1])).rejects.toBeInstanceOf(AlreadySplit);
    expect(mocks.downloadDriveFile).not.toHaveBeenCalled();
  });

  it("stops before creating anything when the file changed in Drive after editing started", async () => {
    mocks.getPdfDocument.mockResolvedValue(doc({ fileBaseline: { title: null } }));
    mocks.getDriveHeadRevisionId.mockResolvedValue("rev-2");
    await expect(splitPdfDocument(ID, [1])).rejects.toBeInstanceOf(SplitConflict);
    expect(mocks.createDriveFile).not.toHaveBeenCalled();
  });

  it("refuses breaks the document can't take, before uploading", async () => {
    mocks.getPdfDocument.mockResolvedValue(doc());
    mocks.downloadDriveFile.mockResolvedValue(await pdfOf(3));
    await expect(splitPdfDocument(ID, [3])).rejects.toBeInstanceOf(InvalidSplit);
    expect(mocks.createDriveFile).not.toHaveBeenCalled();
  });

  // A failure partway must not leave half a split in Drive.
  it("trashes the parts already made when a later upload fails, and records nothing", async () => {
    mocks.getPdfDocument.mockResolvedValue(doc());
    mocks.downloadDriveFile.mockResolvedValue(await pdfOf(3));
    mocks.createDriveFile
      .mockResolvedValueOnce({ id: "drive-part-1", revision: "r-1" })
      .mockRejectedValueOnce(new Error("Drive could not create the file (500)"));
    await expect(splitPdfDocument(ID, [1])).rejects.toThrow("500");
    expect(mocks.trashDriveFile).toHaveBeenCalledWith("token", "drive-part-1");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("says the parts weren't recorded when the database refuses", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.getPdfDocument.mockResolvedValue(doc());
    mocks.downloadDriveFile.mockResolvedValue(await pdfOf(2));
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "40001", message: "moved" } });
    const error = await splitPdfDocument(ID, [1]).catch((e) => e);
    expect(error).toBeInstanceOf(SplitNotRecorded);
    expect(error.driveFileIds).toEqual(["drive-part-1", "drive-part-2"]);
  });

  it("is null for a document that doesn't exist", async () => {
    mocks.getPdfDocument.mockResolvedValue(null);
    expect(await splitPdfDocument(ID, [1])).toBeNull();
  });
});
