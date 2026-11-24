import { describe, it, expect, vi, beforeEach } from "vitest";

type Row = Record<string, unknown>;

/** Two tables and a bucket, with only the calls lib/pdf-page-text.ts makes. */
const db = vi.hoisted(() => ({
  sets: [] as Record<string, unknown>[],
  text: [] as Record<string, unknown>[],
  images: new Map<string, Uint8Array>(),
  failText: false,
}));
const { openPdf, openReader } = vi.hoisted(() => ({ openPdf: vi.fn(), openReader: vi.fn() }));

vi.mock("@/lib/pdf-render", () => ({ openPdf }));
vi.mock("@/lib/pdf-ocr", () => ({ openReader }));
vi.mock("@/lib/pdf-page-store", () => ({ PAGE_BUCKET: "pdf-pages", STORED_WIDTH: 1120 }));
vi.mock("@/lib/pdf-documents", () => {
  const from = (table: "pdf_page_sets" | "pdf_page_text") => {
    const rows = () => (table === "pdf_page_sets" ? db.sets : db.text);
    const tests: ((r: Row) => boolean)[] = [];
    let patch: Row | null = null;
    const q: Record<string, unknown> = {
      select: () => q,
      eq: (k: string, v: unknown) => (tests.push((r) => r[k] === v), q),
      is: (k: string, v: unknown) => (tests.push((r) => (r[k] ?? null) === v), q),
      not: (k: string, _op: string, v: unknown) => (tests.push((r) => (r[k] ?? null) !== v), q),
      update: (p: Row) => ((patch = p), q),
      upsert: async (r: Row) => {
        if (db.failText) return { error: { message: "full" } };
        const i = db.text.findIndex((x) => x.set_id === r.set_id && x.page === r.page);
        if (i < 0) db.text.push({ ...r });
        else db.text[i] = { ...r };
        return { error: null };
      },
      then: (ok: (v: unknown) => unknown) => {
        const hit = rows().filter((r) => tests.every((t) => t(r)));
        if (patch) hit.forEach((r) => Object.assign(r, patch));
        return Promise.resolve({ data: hit, error: null }).then(ok);
      },
    };
    return q;
  };
  const storage = {
    from: () => ({
      download: async (p: string) =>
        db.images.has(p) ? { data: new Blob([db.images.get(p)! as BlobPart]) } : { data: null },
    }),
  };
  return { getPdfAdminClient: () => ({ from, storage }) };
});

import { hasEnoughText, syncText, tidyText, type TextSyncOptions } from "@/lib/pdf-page-text";

const OWN = "Dear families, the winter concert is on Thursday.";
const want = (id: string, revision = "r1") => ({ id, driveFileId: `file-${id}`, revision, pageCount: null });
const set = (id: string, o: Row = {}) => ({
  document_id: id,
  drive_revision: "r1",
  set_id: `set-${id}`,
  page_count: 2,
  drawn_at: "2026-11-24T12:00:00Z",
  text_at: null,
  ...o,
});

function run(o: Partial<TextSyncOptions> & { wanted: TextSyncOptions["wanted"] }) {
  return syncText({
    download: vi.fn(async () => new ArrayBuffer(8)),
    headRevision: async (file) => o.wanted.find((w) => w.driveFileId === file)!.revision,
    outOfTime: () => false,
    ...o,
  });
}

const text = vi.fn();
const draw = vi.fn();
const read = vi.fn();
const closePdf = vi.fn();
const closeReader = vi.fn();

beforeEach(() => {
  db.sets = [];
  db.text = [];
  db.images.clear();
  db.failText = false;
  vi.spyOn(console, "warn").mockImplementation(() => {});
  text.mockReset().mockResolvedValue(OWN);
  draw.mockReset().mockResolvedValue({ jpeg: new Uint8Array([9]) });
  read.mockReset().mockReturnValue({ text: "Total due $84.12 by April", confidence: 91.6 });
  closePdf.mockReset().mockResolvedValue(undefined);
  closeReader.mockReset();
  openPdf.mockReset().mockResolvedValue({ pageCount: 2, text, draw, close: closePdf });
  openReader.mockReset().mockResolvedValue({ read, close: closeReader });
});

describe("keeping a document's text", () => {
  it("keeps what the PDF says, without starting tesseract", async () => {
    db.sets = [set("a")];
    expect(await run({ wanted: [want("a")] })).toEqual({ textPages: 2, scansRead: 0, textWaiting: 0 });
    expect(db.text).toEqual([
      { set_id: "set-a", page: 1, text: OWN, source: "file", confidence: null },
      { set_id: "set-a", page: 2, text: OWN, source: "file", confidence: null },
    ]);
    expect(db.sets[0].text_at).not.toBeNull();
    expect(openReader).not.toHaveBeenCalled();
    expect(closePdf).toHaveBeenCalled();
  });

  it("reads a page with no text of its own from its kept image", async () => {
    db.sets = [set("a")];
    db.images.set("set-a/2.jpg", new Uint8Array([7]));
    text.mockImplementation(async (n: number) => (n === 1 ? OWN : "Page 2"));
    expect(await run({ wanted: [want("a")] })).toEqual({ textPages: 2, scansRead: 1, textWaiting: 0 });
    expect(read).toHaveBeenCalledWith(new Uint8Array([7]));
    expect(db.text[1]).toEqual({
      set_id: "set-a",
      page: 2,
      text: "Total due $84.12 by April",
      source: "ocr",
      confidence: 92,
    });
    expect(draw).not.toHaveBeenCalled();
    expect(closeReader).toHaveBeenCalledTimes(1);
  });

  it("draws the page when its kept image is missing", async () => {
    db.sets = [set("a", { page_count: 1 })];
    text.mockResolvedValue("");
    await run({ wanted: [want("a")] });
    expect(draw).toHaveBeenCalledWith(1, 1120);
    expect(read).toHaveBeenCalledWith(new Uint8Array([9]));
  });

  it("keeps a page it couldn't read as empty, so it isn't tried every hour", async () => {
    db.sets = [set("a", { page_count: 1 })];
    text.mockRejectedValue(new Error("damaged"));
    read.mockImplementation(() => {
      throw new Error("not an image");
    });
    expect(await run({ wanted: [want("a")] })).toMatchObject({ textWaiting: 0 });
    expect(db.text).toEqual([{ set_id: "set-a", page: 1, text: "", source: "ocr", confidence: 0 }]);
  });

  it("picks up where it stopped when time runs out", async () => {
    db.sets = [set("a")];
    let checks = 0;
    expect(await run({ wanted: [want("a")], outOfTime: () => ++checks > 2 })).toMatchObject({
      textPages: 1,
      textWaiting: 1,
    });
    expect(db.sets[0].text_at).toBeNull();
    expect(await run({ wanted: [want("a")] })).toMatchObject({ textPages: 1, textWaiting: 0 });
    expect(db.text.map((r) => r.page)).toEqual([1, 2]);
  });

  it("takes the shortest documents first, and goes on past one that fails", async () => {
    db.sets = [set("long", { page_count: 5 }), set("short", { page_count: 1 })];
    const download = vi.fn(async (f: string) => {
      if (f === "file-short") throw new Error("Drive is down");
      return new ArrayBuffer(8);
    });
    const result = await run({ wanted: [want("long"), want("short")], download });
    expect(download.mock.calls.map(([f]) => f)).toEqual(["file-short", "file-long"]);
    expect(result).toEqual({ textPages: 5, scansRead: 0, textWaiting: 1 });
  });

  it("leaves what isn't drawn, can't be drawn, is done, or isn't the listed version", async () => {
    db.sets = [
      set("undrawn", { drawn_at: null }),
      set("undrawable", { page_count: null }),
      set("done", { text_at: "2026-11-24T13:00:00Z" }),
      set("old", { drive_revision: "r0" }),
      set("gone"),
    ];
    const wanted = ["undrawn", "undrawable", "done", "old"].map((id) => want(id));
    expect(await run({ wanted })).toEqual({ textPages: 0, scansRead: 0, textWaiting: 0 });
    expect(openPdf).not.toHaveBeenCalled();
  });

  it("keeps nothing when the file changed while it was downloaded", async () => {
    db.sets = [set("a")];
    expect(await run({ wanted: [want("a")], headRevision: async () => "r2" })).toMatchObject({ textPages: 0, textWaiting: 1 });
    expect(db.text).toEqual([]);
  });

  it("isn't done while a page couldn't be kept", async () => {
    db.sets = [set("a")];
    db.failText = true;
    expect(await run({ wanted: [want("a")] })).toMatchObject({ textPages: 0, textWaiting: 1 });
    expect(db.sets[0].text_at).toBeNull();
    expect(closePdf).toHaveBeenCalled();
  });
});

describe("tidyText", () => {
  it("drops what can't be stored and evens out the space", () => {
    expect(tidyText("A\u0000B  c \r\n\r\n\r\n\r\n d\t e\ufffe ")).toBe("AB c\n\nd e");
    expect(tidyText("lone \ud800 half, whole 😀")).toBe("lone half, whole 😀");
  });
});

describe("hasEnoughText", () => {
  it("doesn't take a stamp or a page number for a page's text", () => {
    expect(hasEnoughText("Page 2 of 19")).toBe(false);
    expect(hasEnoughText("- - - - - - - - - - - - - - - - -")).toBe(false);
    expect(hasEnoughText(OWN)).toBe(true);
    expect(hasEnoughText("Vielen Dank für Ihren Einkauf")).toBe(true);
  });
});
