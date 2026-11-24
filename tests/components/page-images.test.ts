import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PAGES_IN_FLIGHT, serverPageLoader } from "@/app/pdf-metadata-viewer/page-images";
import type { LoadedPdf } from "@/app/pdf-metadata-viewer/pdfjs";

const BASE = "/api/pdf-documents/id/doc-1/pages";
const jpeg = (count: number) =>
  new Response(new Blob([new Uint8Array([0xff, 0xd8])]), { headers: { "x-page-count": String(count) } });

beforeEach(() => {
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => ({ width: 1120, height: 1449, close: vi.fn() })),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("serverPageLoader", () => {
  it("asks for page 1 first and learns the page count from it", async () => {
    const fetchImpl = vi.fn(async () => jpeg(5));
    const pdf = await serverPageLoader(BASE, 1120, vi.fn(), fetchImpl as unknown as typeof fetch)("/c");
    expect(pdf.numPages).toBe(5);
    expect((fetchImpl.mock.calls[0] as unknown[])[0]).toBe(`${BASE}/1?w=1120`);
  });

  it("fetches the rest a few at a time", async () => {
    const fetchImpl = vi.fn(async () => jpeg(10));
    await serverPageLoader(BASE, 1120, vi.fn(), fetchImpl as unknown as typeof fetch)("/c");
    // Page 1, then no more than PAGES_IN_FLIGHT others at once.
    expect(fetchImpl.mock.calls.length).toBe(1 + PAGES_IN_FLIGHT);
  });

  it("draws a fetched page onto the canvas at its own size", async () => {
    const fetchImpl = vi.fn(async () => jpeg(1));
    const pdf = await serverPageLoader(BASE, 1120, vi.fn(), fetchImpl as unknown as typeof fetch)("/c");
    const drawImage = vi.fn();
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage }) } as unknown as HTMLCanvasElement;
    await pdf.renderPage(1, canvas, 560);
    expect([canvas.width, canvas.height]).toEqual([1120, 1449]);
    expect(drawImage).toHaveBeenCalled();
    expect(await pdf.pageSize?.(1)).toEqual({ width: 1120, height: 1449 });
  });

  it("hands over to pdf.js when the server can't draw the file", async () => {
    const fallbackPdf = { numPages: 2, renderPage: vi.fn() } as LoadedPdf;
    const fallback = vi.fn(async () => fallbackPdf);
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 422 }));
    const pdf = await serverPageLoader(BASE, 1120, fallback, fetchImpl as unknown as typeof fetch)("/c");
    expect(pdf).toBe(fallbackPdf);
    expect(fallback).toHaveBeenCalledWith("/c");
  });

  it("hands over to pdf.js when the reply gives no page count", async () => {
    const fallback = vi.fn(async () => ({ numPages: 1, renderPage: vi.fn() }) as LoadedPdf);
    const fetchImpl = vi.fn(async () => new Response(new Blob([new Uint8Array([1])])));
    await serverPageLoader(BASE, 1120, fallback, fetchImpl as unknown as typeof fetch)("/c");
    expect(fallback).toHaveBeenCalled();
  });
});
