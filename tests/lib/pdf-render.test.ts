// @vitest-environment node
import { describe, it, expect } from "vitest";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { PageOutOfRange, renderPdfPage } from "@/lib/pdf-render";

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
