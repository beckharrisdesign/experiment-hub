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

  it("names the revision on screen, so kept images can be found", async () => {
    const fetchImpl = vi.fn(async () => jpeg(1));
    await serverPageLoader(BASE, 1120, vi.fn(), fetchImpl as unknown as typeof fetch, "rev-1")("/c");
    expect((fetchImpl.mock.calls[0] as unknown[])[0]).toContain(`${BASE}/1?w=1120&rev=rev-1`);
  });

  it("draws a thumbnail small, not at the page's full size", async () => {
    const fetchImpl = vi.fn(async () => jpeg(1));
    const pdf = await serverPageLoader(BASE, 1120, vi.fn(), fetchImpl as unknown as typeof fetch)("/c");
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage: vi.fn() }) } as unknown as HTMLCanvasElement;
    await pdf.renderPage(1, canvas, 148);
    expect([canvas.width, canvas.height]).toEqual([296, 383]);
  });

  it("fetches a few at a time even when every page is asked for at once, as Split does", async () => {
    let now = 0;
    let most = 0;
    const fetchImpl = vi.fn(async () => {
      most = Math.max(most, ++now);
      await new Promise((r) => setTimeout(r, 1));
      now -= 1;
      return jpeg(30);
    });
    const pdf = await serverPageLoader(BASE, 1120, vi.fn(), fetchImpl as unknown as typeof fetch)("/c");
    const canvas = () => ({ width: 0, height: 0, getContext: () => ({ drawImage: vi.fn() }) }) as unknown as HTMLCanvasElement;
    await Promise.all(Array.from({ length: 30 }, (_, i) => pdf.renderPage(i + 1, canvas(), 148)));
    expect(most).toBeLessThanOrEqual(PAGES_IN_FLIGHT);
    expect(fetchImpl).toHaveBeenCalledTimes(30);
  });

  it("fetches no other page until it's asked for", async () => {
    const fetchImpl = vi.fn(async () => jpeg(10));
    const pdf = await serverPageLoader(BASE, 1120, vi.fn(), fetchImpl as unknown as typeof fetch)("/c");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage: vi.fn() }) } as unknown as HTMLCanvasElement;
    await pdf.renderPage(7, canvas, 560);
    expect(fetchImpl.mock.calls.map((c) => String((c as unknown[])[0]).match(/pages\/(\d+)/)![1])).toEqual(["1", "7"]);
  });

  it("asks for small copies for a screen of thumbnails", async () => {
    const fetchImpl = vi.fn(async () => jpeg(2));
    const load = serverPageLoader(BASE, 296, vi.fn(), fetchImpl as unknown as typeof fetch, "rev-1", { thumbs: true });
    expect((await load("/c")).previewPage).toBeUndefined();
    expect(String((fetchImpl.mock.calls[0] as unknown[])[0])).toBe(`${BASE}/1?w=296&rev=rev-1&size=thumb`);
  });

  describe("with small copies kept", () => {
    const canvas = () => ({ width: 0, height: 0, getContext: () => ({ drawImage: vi.fn() }) }) as unknown as HTMLCanvasElement;
    const urls = (f: ReturnType<typeof vi.fn>) => f.mock.calls.map((c) => String(c[0]).replace(BASE, ""));

    it("gets page 1's first, and the page itself only when it's drawn", async () => {
      const fetchImpl = vi.fn(async () => jpeg(19));
      const pdf = await serverPageLoader(BASE, 1120, vi.fn(), fetchImpl as unknown as typeof fetch, "r")("/c");
      expect(pdf.numPages).toBe(19);
      expect(urls(fetchImpl)).toEqual(["/1?w=1120&rev=r&size=thumb&kept=1"]);
      await pdf.previewPage!(1, canvas(), 560);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      await pdf.previewPage!(4, canvas(), 560);
      await pdf.renderPage(1, canvas(), 560);
      expect(urls(fetchImpl).slice(1)).toEqual(["/4?w=1120&rev=r&size=thumb&kept=1", "/1?w=1120&rev=r"]);
    });

    it("goes straight to the page when nothing is kept, and asks for no more small copies", async () => {
      const fetchImpl = vi.fn(async (url: string) =>
        url.includes("kept=1") ? new Response(null, { status: 204 }) : jpeg(3),
      );
      const pdf = await serverPageLoader(BASE, 1120, vi.fn(), fetchImpl as unknown as typeof fetch, "r")("/c");
      expect(pdf.numPages).toBe(3);
      expect(pdf.previewPage).toBeUndefined();
      expect(urls(fetchImpl)).toEqual(["/1?w=1120&rev=r&size=thumb&kept=1", "/1?w=1120&rev=r"]);
    });

    it("says so when one page's small copy is missing", async () => {
      const fetchImpl = vi.fn(async (url: string) =>
        url.includes("/2?") ? new Response(null, { status: 204 }) : jpeg(3),
      );
      const pdf = await serverPageLoader(BASE, 1120, vi.fn(), fetchImpl as unknown as typeof fetch, "r")("/c");
      await expect(pdf.previewPage!(2, canvas(), 560)).rejects.toThrow("No small copy");
    });
  });

  it("draws a fetched page onto the canvas at its own size", async () => {
    const fetchImpl = vi.fn(async () => jpeg(1));
    const pdf = await serverPageLoader(BASE, 1120, vi.fn(), fetchImpl as unknown as typeof fetch)("/c");
    const drawImage = vi.fn();
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage }) } as unknown as HTMLCanvasElement;
    await pdf.renderPage(1, canvas, 560);
    expect([canvas.width, canvas.height]).toEqual([1120, 1449]);
    expect(drawImage).toHaveBeenCalled();
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

  // Live, 16 pages took 28 requests: sizes asked up front, then the queue again.
  it("never fetches a page twice, and asks for no sizes up front", async () => {
    const fetchImpl = vi.fn(async () => jpeg(8));
    const pdf = await serverPageLoader(BASE, 1120, vi.fn(), fetchImpl as unknown as typeof fetch)("/c");
    expect(pdf.pageSize).toBeUndefined();
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage: vi.fn() }) } as unknown as HTMLCanvasElement;
    // Draw page 6 out of turn, then every page in order.
    await pdf.renderPage(6, canvas, 560);
    for (let n = 1; n <= 8; n++) await pdf.renderPage(n, canvas, 560);
    const asked = fetchImpl.mock.calls.map((c) => Number(String((c as unknown[])[0]).match(/pages\/(\d+)/)![1]));
    expect(asked.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
