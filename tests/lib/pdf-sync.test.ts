import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getDriveConnection: vi.fn(),
  getValidAccessToken: vi.fn(),
  listPdfsInFolder: vi.fn(),
  listPdfDocuments: vi.fn(),
  rpc: vi.fn(),
  readFile: vi.fn(),
  syncPages: vi.fn(),
  syncText: vi.fn(),
}));

vi.mock("@/lib/pdf-documents", () => ({
  getPdfAdminClient: () => ({ rpc: mocks.rpc }),
  listPdfDocuments: mocks.listPdfDocuments,
}));
vi.mock("@/lib/pdf-drive", () => ({
  getDriveConnection: mocks.getDriveConnection,
  getValidAccessToken: mocks.getValidAccessToken,
  listPdfsInFolder: mocks.listPdfsInFolder,
  downloadDriveFile: vi.fn(),
  getDriveHeadRevisionId: vi.fn(),
}));
vi.mock("@/lib/pdf-page-store", () => ({ syncPages: mocks.syncPages }));
vi.mock("@/lib/pdf-page-text", () => ({ syncText: mocks.syncText }));
vi.mock("@/lib/pdf-file-read", async () => {
  const actual = await vi.importActual<typeof import("@/lib/pdf-file-read")>("@/lib/pdf-file-read");
  return { ...actual, readFile: mocks.readFile };
});

import { needsRead, syncFolder } from "@/lib/pdf-sync";
import type { PdfDocument } from "@/lib/pdf-documents";

const PAGES = { pagesDrawn: 5, pagesWaiting: 0, setsRemoved: 0 };
const TEXT = { textPages: 3, scansRead: 1, textWaiting: 0 };
const VALUES = { title: "T", subject: null, author: null, keywords: [], pageCount: 2 };

function file(id: string, head = `rev-${id}`) {
  return { id, name: `${id}.pdf`, headRevisionId: head, snapshot: {} };
}
function doc(id: string, overrides: Partial<PdfDocument> = {}): PdfDocument {
  return {
    id: `doc-${id}`,
    driveFileId: id,
    title: null,
    subject: null,
    author: null,
    keywords: [],
    pageCount: null,
    fileBaseline: null,
    driveRevisionId: `rev-${id}`,
    fileRead: null,
    ...overrides,
  } as PdfDocument;
}

beforeEach(() => {
  for (const m of Object.values(mocks)) m.mockReset();
  mocks.getDriveConnection.mockResolvedValue({ folder: { id: "folder-1", name: "Scans" } });
  mocks.getValidAccessToken.mockResolvedValue("token");
  mocks.rpc.mockResolvedValue({ data: { inserted: 1, total: 3 }, error: null });
  mocks.readFile.mockResolvedValue({ ok: true, embedded: VALUES });
  mocks.syncPages.mockResolvedValue(PAGES);
  mocks.syncText.mockResolvedValue(TEXT);
});

describe("needsRead", () => {
  it("is true for a file never read", () => {
    expect(needsRead(doc("a"), "rev-a")).toBe(true);
  });
  it("is false once a read of that revision is saved", () => {
    expect(needsRead(doc("a", { fileRead: { revision: "rev-a", embedded: VALUES } }), "rev-a")).toBe(false);
  });
  it("is true again when the file changes", () => {
    expect(needsRead(doc("a", { fileRead: { revision: "rev-a", embedded: VALUES } }), "rev-b")).toBe(true);
  });
  it("is false for an edited file still at its baseline revision", () => {
    expect(needsRead(doc("a", { fileBaseline: VALUES }), "rev-a")).toBe(false);
  });
  it("is false when Drive gives no revision to save against", () => {
    expect(needsRead(doc("a"), null)).toBe(false);
  });
});

describe("syncFolder", () => {
  it("does nothing until a folder is chosen", async () => {
    mocks.getDriveConnection.mockResolvedValue({ folder: null });
    expect(await syncFolder()).toMatchObject({ skipped: "no-folder", read: 0 });
    expect(mocks.listPdfsInFolder).not.toHaveBeenCalled();
  });

  it("imports the folder, then reads only the files that need it", async () => {
    const files = [file("a"), file("b"), file("c")];
    mocks.listPdfsInFolder.mockResolvedValue(files);
    mocks.listPdfDocuments.mockResolvedValue([
      doc("a"),
      doc("b", { fileRead: { revision: "rev-b", embedded: VALUES } }),
      doc("c"),
    ]);

    const result = await syncFolder();

    expect(mocks.rpc).toHaveBeenCalledWith("pdf_import_folder", {
      folder_id: "folder-1",
      folder_name: "Scans",
      files,
    });
    // Listed after the import, so the new row is there to read.
    expect(mocks.rpc.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.listPdfDocuments.mock.invocationCallOrder[0],
    );
    const readIds = mocks.readFile.mock.calls.map(([d]) => d.driveFileId).sort();
    expect(readIds).toEqual(["a", "c"]);
    expect(mocks.readFile).toHaveBeenCalledWith(expect.objectContaining({ driveFileId: "a" }), {
      ok: true,
      accessToken: "token",
      head: "rev-a",
    });
    expect(result).toEqual({ inFolder: 3, added: 1, read: 2, failed: 0, remaining: 0, pages: PAGES, text: TEXT });
  });

  it("reads never-read files before changed ones", async () => {
    mocks.listPdfsInFolder.mockResolvedValue([file("old", "rev-new"), file("fresh")]);
    mocks.listPdfDocuments.mockResolvedValue([
      doc("old", { fileRead: { revision: "rev-old", embedded: VALUES } }),
      doc("fresh"),
    ]);

    await syncFolder({ concurrency: 1 });

    expect(mocks.readFile.mock.calls.map(([d]) => d.driveFileId)).toEqual(["fresh", "old"]);
  });

  it("counts a failed read and moves on", async () => {
    mocks.listPdfsInFolder.mockResolvedValue([file("a"), file("b")]);
    mocks.listPdfDocuments.mockResolvedValue([doc("a"), doc("b")]);
    mocks.readFile
      .mockResolvedValueOnce({ ok: false, reason: "unreadable" })
      .mockResolvedValueOnce({ ok: true, embedded: VALUES });

    expect(await syncFolder({ concurrency: 1 })).toMatchObject({ read: 1, failed: 1, remaining: 0 });
  });

  it("stops starting reads when the time is up, leaving the rest for the next run", async () => {
    mocks.listPdfsInFolder.mockResolvedValue([file("a"), file("b"), file("c")]);
    mocks.listPdfDocuments.mockResolvedValue([doc("a"), doc("b"), doc("c")]);
    let clock = 0;
    mocks.readFile.mockImplementation(async () => {
      clock += 600;
      return { ok: true, embedded: VALUES };
    });

    const result = await syncFolder({ budgetMs: 1000, concurrency: 1, now: () => clock });

    expect(result).toMatchObject({ read: 2, remaining: 1 });
  });

  it("draws ahead for the listed documents, at the revision Drive listed", async () => {
    mocks.listPdfsInFolder.mockResolvedValue([file("a", "rev-new"), file("split-original")]);
    mocks.listPdfDocuments.mockResolvedValue([doc("a", { fileRead: { revision: "rev-a", embedded: VALUES } })]);
    await syncFolder();
    // A split original isn't listed, so its pages aren't kept.
    expect(mocks.syncPages.mock.calls[0][0].wanted).toEqual([
      { id: "doc-a", driveFileId: "a", revision: "rev-new", pageCount: 2 },
    ]);
  });

  it("gives drawing only the time reading left", async () => {
    mocks.listPdfsInFolder.mockResolvedValue([file("a")]);
    mocks.listPdfDocuments.mockResolvedValue([doc("a")]);
    let clock = 0;
    mocks.readFile.mockImplementation(async () => {
      clock += 1500;
      return { ok: true, embedded: VALUES };
    });
    await syncFolder({ budgetMs: 1000, now: () => clock });
    expect(mocks.syncPages.mock.calls[0][0].outOfTime()).toBe(true);
  });

  it("still reports the sync when drawing ahead fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.listPdfsInFolder.mockResolvedValue([file("a")]);
    mocks.listPdfDocuments.mockResolvedValue([doc("a")]);
    mocks.syncPages.mockRejectedValue(new Error("no such table"));
    const result = await syncFolder();
    expect(result).toEqual({ inFolder: 1, added: 1, read: 1, failed: 0, remaining: 0, text: TEXT });
    mocks.syncPages.mockResolvedValue(PAGES);
    mocks.syncText.mockRejectedValue(new Error("no such table"));
    expect(await syncFolder()).toEqual({ inFolder: 1, added: 1, read: 1, failed: 0, remaining: 0, pages: PAGES });
  });

  it("fails loudly when the references can't be stored", async () => {
    mocks.listPdfsInFolder.mockResolvedValue([]);
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(syncFolder()).rejects.toThrow(/boom/);
  });
});
