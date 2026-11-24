import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/pdf-documents", () => ({ getPdfAdminClient: vi.fn() }));
vi.mock("@/lib/pdf-render", () => ({ openPdf: vi.fn(), shrinkJpeg: vi.fn() }));
vi.mock("@/lib/pdf-ocr", () => ({ openReader: vi.fn() }));

import { toListRow } from "@/lib/pdf-list-rows";
import type { PdfDocument } from "@/lib/pdf-documents";

const doc = (tags: string[], o: Partial<PdfDocument> = {}) =>
  ({
    id: "a",
    filename: "a.pdf",
    title: null,
    subject: null,
    author: null,
    keywords: [],
    pageCount: 1,
    fileBaseline: null,
    fileRead: { revision: "r1", embedded: { title: null, subject: null, author: null, keywords: tags, pageCount: 1 } },
    driveRevisionId: "r1",
    hasPendingEdits: false,
    committedAt: null,
    supersededAt: null,
    splitNotNeeded: false,
    ...o,
  }) as PdfDocument;
const label = (d: PdfDocument) => toListRow(d).stateLabel;

describe("a row's state", () => {
  it("says so when the file came with tags of its own", () => {
    expect(label(doc(["letter"]))).toBe("Already tagged");
    expect(label(doc([]))).toBe("Not yet tagged");
  });

  it("never asks to split one that did, however long", () => {
    expect(label(doc(["letter"], { pageCount: 119 }))).toBe("Already tagged");
    expect(label(doc([], { pageCount: 119 }))).toBe("Split first?");
  });

  it("says Committed once it has been, and nothing about tags not read yet", () => {
    expect(label(doc(["letter"], { committedAt: "2026-11-24" }))).toBe("Committed");
    expect(label(doc([], { fileRead: null }))).toBe("Not yet tagged");
  });
});
