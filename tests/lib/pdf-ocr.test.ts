// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { openReader, type PageReader } from "@/lib/pdf-ocr";
import { openPdf } from "@/lib/pdf-render";

/** A made-up page, drawn as pages are kept: an image is all tesseract gets. */
async function scan(lines: string[], size = 18): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);
  lines.forEach((line, i) => page.drawText(line, { x: 60, y: 700 - i * size * 2, size, font }));
  const pdf = await openPdf(await doc.save());
  try {
    return (await pdf.draw(1, 1120)).jpeg;
  } finally {
    await pdf.close();
  }
}

let reader: PageReader;
beforeAll(async () => {
  reader = await openReader();
}, 30_000);
afterAll(() => reader.close());

describe("reading a scanned page", () => {
  it("reads print, and is sure of it", async () => {
    const { text, confidence } = reader.read(
      await scan(["Example Utility Co.", "Invoice 48213", "Total due by April 18, 2026"]),
    );
    expect(text).toContain("Example Utility Co.");
    expect(text).toContain("Invoice 48213");
    expect(text).toContain("April 18, 2026");
    expect(confidence).toBeGreaterThan(80);
  }, 30_000);

  it("reads one page after another, each on its own", async () => {
    const first = reader.read(await scan(["The first page"]));
    const second = reader.read(await scan(["Another one altogether"]));
    expect(first.text).toContain("first page");
    expect(second.text).toContain("Another one altogether");
    expect(second.text).not.toContain("first");
  }, 30_000);

  it("finds next to nothing on a blank page", async () => {
    expect(reader.read(await scan([])).text.trim().length).toBeLessThan(5);
  }, 30_000);

  it("says so when it isn't given an image", () => {
    expect(() => reader.read(new Uint8Array([1, 2, 3]))).toThrow();
  });
});
