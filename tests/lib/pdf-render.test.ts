// @vitest-environment node
import { describe, it, expect } from "vitest";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { openPdf, PageOutOfRange, renderPdfPage, shrinkJpeg } from "@/lib/pdf-render";

async function samplePdf(pages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) {
    const page = doc.addPage([612, 792]);
    page.drawRectangle({ x: 40, y: 640, width: 532, height: 110, color: rgb(0.85, 0.92, 1) });
    page.drawText(`Made-up page ${i + 1}`, { x: 60, y: 700, size: 28, font });
  }
  return doc.save();
}

describe("renderPdfPage", () => {
  it("draws the page asked for as a JPEG at the width asked for", async () => {
    const page = await renderPdfPage(await samplePdf(3), 2, 560);
    expect(page.pageCount).toBe(3);
    expect(page.width).toBe(560);
    expect(page.height).toBe(Math.round((792 * 560) / 612));
    // JPEG files start FF D8 FF.
    expect([...page.jpeg.slice(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  });

  it("gives a page's own words, line by line, and nothing for a page without any", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([612, 792]);
    page.drawText("First line", { x: 60, y: 700, size: 14, font });
    page.drawText("Second line", { x: 60, y: 660, size: 14, font });
    doc.addPage([612, 792]);
    const pdf = await openPdf(await doc.save());
    expect((await pdf.text(1)).split("\n").map((l) => l.trim()).filter(Boolean)).toEqual(["First line", "Second line"]);
    expect((await pdf.text(2)).trim()).toBe("");
    await pdf.close();
  });

  it("makes a smaller copy of a drawn page, and never a bigger one", async () => {
    const { jpeg } = await renderPdfPage(await samplePdf(1), 1, 600);
    const small = await shrinkJpeg(jpeg, 296);
    expect([...small.slice(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
    expect(small.byteLength).toBeLessThan(jpeg.byteLength);
    const { loadImage } = await import("@napi-rs/canvas");
    const image = await loadImage(Buffer.from(small));
    expect([image.width, image.height]).toEqual([296, Math.round((776 * 296) / 600)]);
    expect((await loadImage(Buffer.from(await shrinkJpeg(jpeg, 5000)))).width).toBe(600);
  });

  it("draws several pages from one opening", async () => {
    const pdf = await openPdf(await samplePdf(3));
    expect(pdf.pageCount).toBe(3);
    for (const n of [1, 3, 1]) expect((await pdf.draw(n, 200)).width).toBe(200);
    await pdf.close();
  });

  // Deployed, pdf.js couldn't find its worker by path (#636); it's handed over instead.
  it("hands pdf.js its worker, rather than leaving pdf.js to find it by path", async () => {
    await renderPdfPage(await samplePdf(1), 1, 200);
    const worker = (globalThis as { pdfjsWorker?: { WorkerMessageHandler?: unknown } }).pdfjsWorker;
    expect(worker?.WorkerMessageHandler).toBeDefined();
  });

  it("refuses a page past the end, saying how many there are", async () => {
    const error = await renderPdfPage(await samplePdf(2), 3, 560).catch((e) => e);
    expect(error).toBeInstanceOf(PageOutOfRange);
    expect(error.pageCount).toBe(2);
  });
});
