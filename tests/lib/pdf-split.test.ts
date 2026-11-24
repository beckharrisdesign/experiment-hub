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
  SplitTooLong,
  START_WITHIN_MS,
  UPLOADS_AT_ONCE,
  partName,
  planParts,
  splitPdfDocument,
} from "@/lib/pdf-split";
import { namePartsOf, partTitles, safeFileName, type NamingChoices } from "@/lib/pdf-split-plan";

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

// Task 7g, Figma 02.15.
describe("naming parts", () => {
  const PARTS = planParts(6, [2, 5]);
  const choose = (o: Partial<NamingChoices> = {}): NamingChoices => ({
    title: "Camp art",
    number: true,
    nameFromTitle: true,
    edited: new Map(),
    ...o,
  });
  const names = (o: Partial<NamingChoices> = {}, parts = PARTS) =>
    namePartsOf("04272025_Scan.pdf", parts, choose(o)).map((n) => `${n.title} | ${n.filename}`);

  it("numbers titles and names the files to match", () => {
    expect(names()).toEqual([
      "Camp art, 1 of 3 | Camp art 1.pdf",
      "Camp art, 2 of 3 | Camp art 2.pdf",
      "Camp art, 3 of 3 | Camp art 3.pdf",
    ]);
  });

  it("pads file numbers so nineteen files sort in page order", () => {
    const nineteen = planParts(19, Array.from({ length: 18 }, (_, i) => i + 1));
    const files = namePartsOf("s.pdf", nineteen, choose()).map((n) => n.filename);
    expect(files[0]).toBe("Camp art 01.pdf");
    expect([...files].sort()).toEqual(files);
    expect(new Set(partTitles(nineteen, choose())).size).toBe(19);
  });

  it("keeps an edited title with its pages, however the rest changes", () => {
    const edited = new Map([[6, "Clay fox"]]);
    expect(names({ edited })[2]).toBe("Clay fox | Clay fox.pdf");
    expect(names({ edited, title: "Something else", number: false })[2]).toBe("Clay fox | Clay fox.pdf");
    // Another break earlier moves page 6 from the third part to the fourth.
    expect(names({ edited }, planParts(6, [1, 2, 5]))[3]).toBe("Clay fox | Clay fox.pdf");
  });

  it("keeps the scan's name for a part with no title, or when asked to", () => {
    expect(names({ title: "" })).toEqual([
      "null | 04272025_Scan-001.pdf",
      "null | 04272025_Scan-002.pdf",
      "null | 04272025_Scan-003.pdf",
    ]);
    expect(names({ nameFromTitle: false })[1]).toBe("Camp art, 2 of 3 | 04272025_Scan-002.pdf");
    expect(names({ edited: new Map([[3, ""]]) })[1]).toBe("null | 04272025_Scan-002.pdf");
  });

  it("never gives two files the same name", () => {
    expect(names({ number: false })).toEqual([
      "Camp art | Camp art.pdf",
      "Camp art | Camp art 2.pdf",
      "Camp art | Camp art 3.pdf",
    ]);
    expect(names({ number: false, edited: new Map([[3, "CAMP ART"], [6, "Camp art 2"]]) }).map((n) => n.split(" | ")[1].toLowerCase())).toEqual([
      "camp art.pdf",
      "camp art 2.pdf",
      "camp art 2 2.pdf",
    ]);
  });

  it("drops what a file name can't carry", () => {
    expect(safeFileName('Q1/Q2: "What?" <a|b>*\\')).toBe("Q1 Q2 What a b");
    expect(safeFileName("..hidden.")).toBe("hidden");
    expect(safeFileName("tab\there\u0000")).toBe("tab here");
    expect(safeFileName("///")).toBe("");
    expect(safeFileName("x".repeat(400))).toHaveLength(150);
    expect(names({ title: "???" })[0]).toBe("???, 1 of 3 | 04272025_Scan-001.pdf");
  });
});

describe("splitPdfDocument with names and choices (task 7g)", () => {
  const load = (i: number) =>
    PDFDocument.load(mocks.createDriveFile.mock.calls[i][1].bytes, { updateMetadata: false });

  beforeEach(async () => {
    mocks.getPdfDocument.mockResolvedValue(doc({ subject: "Summer camp", author: "Somebody" }));
    mocks.downloadDriveFile.mockResolvedValue(await pdfOf(2));
  });

  it("gives each part its own title and file name", async () => {
    await splitPdfDocument(ID, [1], {
      parts: [
        { title: "Camp art, 1 of 2", filename: "Camp art 1.pdf" },
        { title: null, filename: "Camp art 2.pdf" },
      ],
    });
    expect(mocks.createDriveFile.mock.calls.map(([, f]) => f.name)).toEqual(["Camp art 1.pdf", "Camp art 2.pdf"]);
    expect((await load(0)).getTitle()).toBe("Camp art, 1 of 2");
    expect((await load(1)).getTitle() || null).toBeNull();
    expect((await load(1)).getSubject()).toBe("Summer camp");
    expect(mocks.rpc.mock.calls[0][1].outputs.map((o: { filename: string }) => o.filename)).toEqual([
      "Camp art 1.pdf",
      "Camp art 2.pdf",
    ]);
  });

  it("copies only what was asked for", async () => {
    await splitPdfDocument(ID, [1], { copy: { subject: false, keywords: false } });
    const part = await load(0);
    expect(part.getSubject() || null).toBeNull();
    expect(part.getKeywords() || null).toBeNull();
    expect(part.getAuthor()).toBe("Somebody");
    expect(part.getTitle()).toBe("Groceries");
  });

  it("never takes an unsafe file name from the request", async () => {
    await splitPdfDocument(ID, [1], {
      parts: [
        { title: "a", filename: "../../etc/passwd" },
        { title: "b", filename: "///.pdf" },
      ],
    });
    expect(mocks.createDriveFile.mock.calls.map(([, f]) => f.name)).toEqual([
      "etc passwd.pdf",
      "04272025_Scan-002.pdf",
    ]);
  });

  it("refuses names for a different split, before uploading", async () => {
    await expect(
      splitPdfDocument(ID, [1], { parts: [{ title: "a", filename: "a.pdf" }] }),
    ).rejects.toBeInstanceOf(InvalidSplit);
    expect(mocks.createDriveFile).not.toHaveBeenCalled();
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

  // Found live: a scan never edited here has null stored fields; the parts
  // must carry what the file itself says, as the detail page shows it.
  it("carries the file's own values when the document was never edited here", async () => {
    const source = await PDFDocument.load(await pdfOf(2));
    source.setTitle("Split test");
    source.setKeywords(["split-test"]);
    const bytes = await source.save();
    mocks.getPdfDocument.mockResolvedValue(doc({ title: null, keywords: [] }));
    mocks.downloadDriveFile.mockResolvedValue(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    );

    await splitPdfDocument(ID, [1]);

    const part = await PDFDocument.load(mocks.createDriveFile.mock.calls[0][1].bytes, { updateMetadata: false });
    expect(part.getTitle()).toBe("Split test");
    expect(part.getKeywords()).toBe("split-test");
    expect(mocks.rpc.mock.calls[0][1].outputs[0].embedded.keywords).toEqual(["split-test"]);
  });

  it("uses only the stored values once editing has started", async () => {
    const source = await PDFDocument.load(await pdfOf(2));
    source.setTitle("Old title in the file");
    const bytes = await source.save();
    mocks.getPdfDocument.mockResolvedValue(doc({ title: null, fileBaseline: { title: "Old title in the file" } }));
    mocks.downloadDriveFile.mockResolvedValue(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    );

    await splitPdfDocument(ID, [1]);

    const part = await PDFDocument.load(mocks.createDriveFile.mock.calls[0][1].bytes, { updateMetadata: false });
    expect(part.getTitle() || null).toBeNull();
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

  describe("many parts", () => {
    const every = (pages: number) => Array.from({ length: pages - 1 }, (_, i) => i + 1);
    const tick = () => new Promise((r) => setTimeout(r, 5));

    it("sends a few at a time, and records them in page order whichever finishes first", async () => {
      mocks.getPdfDocument.mockResolvedValue(doc());
      mocks.downloadDriveFile.mockResolvedValue(await pdfOf(12));
      let now = 0;
      let most = 0;
      let n = 0;
      mocks.createDriveFile.mockImplementation(async () => {
        const id = ++n;
        most = Math.max(most, ++now);
        // Later ones finish sooner.
        await new Promise((r) => setTimeout(r, 40 - (id % 4) * 10));
        now -= 1;
        return { id: `drive-part-${id}`, revision: `r-${id}` };
      });
      await splitPdfDocument(ID, every(12));
      expect(most).toBe(UPLOADS_AT_ONCE);
      const outputs = mocks.rpc.mock.calls[0][1].outputs as { index: number; driveFileId: string }[];
      expect(outputs.map((o) => o.index)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
      expect(outputs.map((o) => o.driveFileId)).toEqual(Array.from({ length: 12 }, (_, i) => `drive-part-${i + 1}`));
    });

    it("waits for uploads still going before taking back what was made", async () => {
      mocks.getPdfDocument.mockResolvedValue(doc());
      mocks.downloadDriveFile.mockResolvedValue(await pdfOf(8));
      let n = 0;
      let finishSlow: () => void = () => {};
      mocks.createDriveFile.mockImplementation(async () => {
        const id = ++n;
        if (id === 1) await new Promise<void>((r) => (finishSlow = r));
        if (id === 2) throw new Error("Drive could not create the file (500)");
        return { id: `drive-part-${id}`, revision: null };
      });
      const outcome = splitPdfDocument(ID, every(8)).catch((e) => e);
      for (let i = 0; i < 20; i++) await tick();
      expect(mocks.trashDriveFile).not.toHaveBeenCalled();
      finishSlow();
      expect(String(await outcome)).toContain("500");
      // Everything that was made, the slow one too, and nothing started after the failure.
      const trashed = mocks.trashDriveFile.mock.calls.map(([, id]) => id).sort();
      expect(trashed).toContain("drive-part-1");
      expect(trashed).toHaveLength(mocks.createDriveFile.mock.calls.length - 1);
      expect(mocks.createDriveFile.mock.calls.length).toBeLessThan(8);
      expect(mocks.rpc).not.toHaveBeenCalled();
    });

    it("stops in time to take everything back, and says so", async () => {
      mocks.getPdfDocument.mockResolvedValue(doc());
      mocks.downloadDriveFile.mockResolvedValue(await pdfOf(6));
      const clock = vi.spyOn(Date, "now");
      const start = 1_000_000;
      clock.mockImplementation(() => start + (mocks.createDriveFile.mock.calls.length >= 2 ? START_WITHIN_MS + 1 : 0));
      const error = await splitPdfDocument(ID, every(6)).catch((e) => e);
      clock.mockRestore();
      expect(error).toBeInstanceOf(SplitTooLong);
      expect(mocks.createDriveFile).toHaveBeenCalledTimes(2);
      expect(mocks.trashDriveFile).toHaveBeenCalledTimes(2);
      expect(mocks.rpc).not.toHaveBeenCalled();
    });
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
