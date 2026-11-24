import { describe, it, expect, vi, beforeEach } from "vitest";

type Row = Record<string, unknown>;
const db = vi.hoisted(() => ({ tables: {} as Record<string, Record<string, unknown>[]>, down: false }));
const { loadTaxonomy } = vi.hoisted(() => ({ loadTaxonomy: vi.fn() }));

vi.mock("@/lib/pdf-taxonomy", () => ({ loadTaxonomy, DECISION_TAGS: [] }));
vi.mock("@/lib/pdf-render", () => ({ openPdf: vi.fn(), shrinkJpeg: vi.fn() }));
vi.mock("@/lib/pdf-ocr", () => ({ openReader: vi.fn() }));
vi.mock("@/lib/pdf-documents", () => ({
  getPdfAdminClient: () => ({
    from: (table: string) => {
      const tests: ((r: Row) => boolean)[] = [];
      let act: "read" | "update" | "delete" = "read";
      let patch: Row = {};
      const q: Record<string, unknown> = {
        select: () => q,
        eq: (k: string, v: unknown) => (tests.push((r) => r[k] === v), q),
        in: (k: string, v: unknown[]) => (tests.push((r) => v.includes(r[k])), q),
        is: (k: string, v: unknown) => (tests.push((r) => (r[k] ?? null) === v), q),
        not: (k: string, _o: string, v: unknown) => (tests.push((r) => (r[k] ?? null) !== v), q),
        update: (p: Row) => ((act = "update"), (patch = p), q),
        delete: () => ((act = "delete"), q),
        upsert: async (r: Row) => {
          const rows = (db.tables[table] ??= []);
          const i = rows.findIndex((x) => x.document_id === r.document_id && x.drive_revision === r.drive_revision);
          if (i < 0) rows.push({ dismissed_at: null, ...r });
          else Object.assign(rows[i], r);
          return { error: null };
        },
        then: (ok: (v: unknown) => unknown) => {
          if (db.down) return Promise.resolve({ data: null, error: { message: "down" } }).then(ok);
          const rows = db.tables[table] ?? [];
          const hit = rows.filter((r) => tests.every((t) => t(r)));
          if (act === "update") hit.forEach((r) => Object.assign(r, patch));
          if (act === "delete") db.tables[table] = rows.filter((r) => !hit.includes(r));
          return Promise.resolve({ data: hit, error: null }).then(ok);
        },
      };
      return q;
    },
  }),
}));

import { dismissPrefill, openPrefills, syncPrefills } from "@/lib/pdf-prefills";
import type { PdfDocument } from "@/lib/pdf-documents";

const doc = (id: string, o: Partial<PdfDocument> = {}) =>
  ({
    id,
    filename: "04252026_FOODMART.pdf",
    title: null,
    subject: null,
    author: null,
    keywords: [],
    pageCount: 1,
    fileBaseline: null,
    fileRead: { revision: "r1", embedded: { title: null, subject: null, author: null, keywords: [], pageCount: 1 } },
    driveRevisionId: "r1",
    hasPendingEdits: false,
    committedAt: null,
    supersededAt: null,
    splitNotNeeded: false,
    ...o,
  }) as PdfDocument;

const RECEIPT = "FOODMART\nSubtotal 8.20\nTotal 8.95\nVISA 1234";

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  db.down = false;
  db.tables = {
    pdf_prefills: [],
    pdf_page_sets: [{ document_id: "a", drive_revision: "r1", set_id: "s-a", text_at: "now" }],
    pdf_page_text: [{ set_id: "s-a", page: 1, text: RECEIPT, source: "ocr", confidence: 80 }],
  };
  loadTaxonomy.mockReset().mockResolvedValue({
    documentTypes: ["receipt"],
    categories: ["grocery"],
    specials: ["original-scan"],
    peopleWithNames: [],
    vendorsWithNames: [{ name: "Foodmart", slug: "foodmart", aliases: [], categories: ["grocery"], location: "" }],
    locations: [],
  });
});

describe("prefilling", () => {
  it("leaves what the text says waiting, and shows it", async () => {
    expect(await syncPrefills([doc("a")])).toEqual({ prefilled: 1 });
    const open = await openPrefills([doc("a")]);
    expect(open.get("a")).toMatchObject({ title: "Foodmart grocery receipt" });
    expect(open.get("a")!.keywords).toContain("foodmart");
  });

  it("doesn't touch documents with edits or tags, long ones, or ones without text", async () => {
    const documents = [
      doc("a", { hasPendingEdits: true }),
      doc("a", { keywords: ["receipt"] }),
      doc("a", { pageCount: 30 }),
      doc("b"),
    ];
    for (const d of documents) expect(await syncPrefills([d])).toEqual({ prefilled: 0 });
    expect(db.tables.pdf_prefills).toEqual([]);
    // Nothing to match, so Notion isn't asked.
    expect(loadTaxonomy).not.toHaveBeenCalled();
  });

  it("stops being shown once the document has an edit, or its file changes", async () => {
    await syncPrefills([doc("a")]);
    const baseline = { title: null, subject: null, author: null, keywords: [], pageCount: 1 };
    expect((await openPrefills([doc("a", { fileBaseline: baseline })])).size).toBe(0);
    expect((await openPrefills([doc("a", { driveRevisionId: "r2" })])).size).toBe(0);
    expect((await openPrefills([doc("a")])).size).toBe(1);
  });

  it("stays dismissed for that version of the file", async () => {
    await syncPrefills([doc("a")]);
    expect(await dismissPrefill("a", "r1")).toBe(true);
    expect(await dismissPrefill("a", "r1")).toBe(false);
    expect((await openPrefills([doc("a")])).size).toBe(0);
    expect(await syncPrefills([doc("a")])).toEqual({ prefilled: 0 });
    expect((await openPrefills([doc("a")])).size).toBe(0);
    db.tables.pdf_page_sets[0].drive_revision = "r2";
    const read = { ...doc("a").fileRead!, revision: "r2" };
    expect(await syncPrefills([doc("a", { driveRevisionId: "r2", fileRead: read })])).toEqual({ prefilled: 1 });
  });

  it("keeps up with Entities: found later, or no longer found", async () => {
    const known = await loadTaxonomy();
    loadTaxonomy.mockResolvedValue({ ...known, vendorsWithNames: [], documentTypes: [] });
    expect(await syncPrefills([doc("a")])).toEqual({ prefilled: 0 });
    loadTaxonomy.mockResolvedValue(known);
    expect(await syncPrefills([doc("a")])).toEqual({ prefilled: 1 });
    loadTaxonomy.mockResolvedValue({ ...known, vendorsWithNames: [], documentTypes: [] });
    await syncPrefills([doc("a")]);
    expect(db.tables.pdf_prefills).toEqual([]);
  });

  it("never stops a page loading", async () => {
    db.down = true;
    expect((await openPrefills([doc("a")])).size).toBe(0);
  });
});
