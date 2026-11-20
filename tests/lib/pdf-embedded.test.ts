import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { readEmbeddedMetadata, splitKeywords } from "@/lib/pdf-embedded";

async function pdfWith(meta: {
  title?: string;
  subject?: string;
  author?: string;
  keywords?: string[];
  pages?: number;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < (meta.pages ?? 1); i++) pdf.addPage();
  if (meta.title !== undefined) pdf.setTitle(meta.title);
  if (meta.subject !== undefined) pdf.setSubject(meta.subject);
  if (meta.author !== undefined) pdf.setAuthor(meta.author);
  if (meta.keywords !== undefined) pdf.setKeywords(meta.keywords);
  return pdf.save();
}

describe("splitKeywords", () => {
  it("round-trips pdf-lib's space-joined slugs (D0)", () => {
    expect(splitKeywords("invoice utilities paid year-2026")).toEqual([
      "invoice",
      "utilities",
      "paid",
      "year-2026",
    ]);
  });

  it("keeps a spaced keyword whole when another tool used commas", () => {
    expect(splitKeywords("invoice, Smith Jane, paid")).toEqual([
      "invoice",
      "Smith Jane",
      "paid",
    ]);
  });

  it("treats semicolons as delimiters too", () => {
    expect(splitKeywords("tax;keep-7yr; financial")).toEqual([
      "tax",
      "keep-7yr",
      "financial",
    ]);
  });

  it("returns nothing for an empty or absent string", () => {
    expect(splitKeywords("")).toEqual([]);
    expect(splitKeywords("   ")).toEqual([]);
    expect(splitKeywords(undefined)).toEqual([]);
    expect(splitKeywords(null)).toEqual([]);
  });
});

describe("readEmbeddedMetadata", () => {
  it("reads title, subject, author, keywords and page count", async () => {
    const bytes = await pdfWith({
      title: "March electricity invoice",
      subject: "Utility bill",
      author: "Watermark Power",
      keywords: ["invoice", "utilities", "paid"],
      pages: 3,
    });

    expect(await readEmbeddedMetadata(bytes)).toEqual({
      title: "March electricity invoice",
      subject: "Utility bill",
      author: "Watermark Power",
      keywords: ["invoice", "utilities", "paid"],
      pageCount: 3,
    });
  });

  it("reports absent and blank fields as null, not empty strings", async () => {
    const bytes = await pdfWith({ title: "   " });
    const meta = await readEmbeddedMetadata(bytes);
    expect(meta.title).toBeNull();
    expect(meta.subject).toBeNull();
    expect(meta.author).toBeNull();
    expect(meta.keywords).toEqual([]);
  });

  it("accepts an ArrayBuffer, which is what a Drive download yields", async () => {
    const bytes = await pdfWith({ title: "From Drive" });
    // A copy, so the buffer is a plain ArrayBuffer rather than ArrayBufferLike.
    const buffer = new Uint8Array(bytes).buffer;
    expect((await readEmbeddedMetadata(buffer)).title).toBe("From Drive");
  });

  it("rejects bytes that are not a PDF", async () => {
    await expect(
      readEmbeddedMetadata(new TextEncoder().encode("not a pdf")),
    ).rejects.toThrow();
  });
});
