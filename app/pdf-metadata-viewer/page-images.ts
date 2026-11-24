import { loadWithPdfJs, type LoadedPdf, type PdfLoader } from "@/app/pdf-metadata-viewer/pdfjs";

/**
 * Pages drawn on the server, as the detail preview's source (task 7c.3).
 *
 * `GET …/pages/N` returns page N as a JPEG and the page count in
 * `X-Page-Count`. Page 1 comes first and says how many there are; the rest are
 * fetched a few at a time while page 1 is already on screen. The view still
 * draws them in order. Should the server not manage a file (a PDF its pdf.js
 * can't draw), the browser's pdf.js takes over, as before.
 */

/** Pages in flight at once after the first; small images, so a few is plenty. */
export const PAGES_IN_FLIGHT = 3;

type Decoded = { source: CanvasImageSource; width: number; height: number };

async function decode(res: Response): Promise<Decoded> {
  const blob = await res.blob();
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob);
    return { source: bitmap, width: bitmap.width, height: bitmap.height };
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function serverPageLoader(
  pagesBase: string,
  width: number,
  fallback: PdfLoader = loadWithPdfJs,
  fetchImpl: typeof fetch = (...args) => fetch(...args),
): PdfLoader {
  return async (contentUrl) => {
    const pageUrl = (n: number) => `${pagesBase}/${n}?w=${width}`;
    const get = async (n: number) => {
      const res = await fetchImpl(pageUrl(n), { cache: "no-store", credentials: "include" });
      if (!res.ok) throw new Error(`Page ${n} couldn't be drawn (${res.status})`);
      return res;
    };

    let first: Response;
    try {
      first = await get(1);
    } catch {
      return fallback(contentUrl);
    }
    const count = Number(first.headers.get("x-page-count"));
    if (!Number.isInteger(count) || count < 1) return fallback(contentUrl);

    const pages = new Map<number, Promise<Decoded>>([[1, decode(first)]]);
    let next = 2;
    let inFlight = 0;
    let stopped = false;
    const pump = () => {
      while (!stopped && inFlight < PAGES_IN_FLIGHT && next <= count) {
        const n = next++;
        // Already asked for out of turn (renderPage): never fetch a page twice.
        if (pages.has(n)) continue;
        inFlight += 1;
        const page = get(n).then(decode);
        pages.set(n, page);
        page.then(
          () => {
            inFlight -= 1;
            pump();
          },
          () => {
            inFlight -= 1;
            pump();
          },
        );
      }
    };
    pump();

    const pageAt = (n: number) => {
      let page = pages.get(n);
      if (!page) {
        page = get(n).then(decode);
        pages.set(n, page);
      }
      return page;
    };

    return {
      numPages: count,
      async renderPage(n, canvas) {
        const page = await pageAt(n);
        canvas.width = page.width;
        canvas.height = page.height;
        canvas.getContext("2d")?.drawImage(page.source, 0, 0);
      },
      // No pageSize: asking every placeholder's size up front fetched all the
      // pages at once, around the queue, and the queue then fetched them again
      // (28 requests for 16 pages, live). Placeholders keep the default page
      // shape until their image arrives.
      destroy() {
        stopped = true;
        for (const page of pages.values()) {
          page.then((p) => ("close" in p.source ? (p.source as ImageBitmap).close() : undefined), () => {});
        }
        pages.clear();
      },
    } satisfies LoadedPdf;
  };
}
