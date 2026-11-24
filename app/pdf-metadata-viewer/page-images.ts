import { loadWithPdfJs, type LoadedPdf, type PdfLoader } from "@/app/pdf-metadata-viewer/pdfjs";

/**
 * Pages drawn on the server, as the source for the detail preview (task 7c.3)
 * and the splitter's thumbnails (task 7f).
 *
 * `GET …/pages/N` returns page N as a JPEG and the page count in
 * `X-Page-Count`. Page 1 comes first and says how many there are; the rest are
 * fetched a few at a time, in order, while page 1 is already on screen. Should
 * the server not manage a file (a PDF its pdf.js can't draw), the browser's
 * pdf.js takes over, as before.
 *
 * The JPEGs are held as they came and decoded only to be drawn: decoded, a
 * 100-page scan would take hundreds of megabytes.
 */

/** Pages in flight at once after the first; small images, so a few is plenty. */
export const PAGES_IN_FLIGHT = 6;

/** Canvas pixels per pixel asked for: sharp on a dense screen, and no more. */
const DENSITY = 2;

type Decoded = { source: CanvasImageSource; width: number; height: number; release: () => void };

async function decode(blob: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
  }
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
  return {
    source: img,
    width: img.naturalWidth,
    height: img.naturalHeight,
    release: () => URL.revokeObjectURL(url),
  };
}

export function serverPageLoader(
  pagesBase: string,
  width: number,
  fallback: PdfLoader = loadWithPdfJs,
  fetchImpl: typeof fetch = (...args) => fetch(...args),
  /** The Drive revision on screen, which finds its kept images (task 7f). */
  revision: string | null = null,
): PdfLoader {
  const rev = revision ? `&rev=${encodeURIComponent(revision)}` : "";
  return async (contentUrl) => {
    const get = async (n: number) => {
      const res = await fetchImpl(`${pagesBase}/${n}?w=${width}${rev}`, {
        cache: "no-store",
        credentials: "include",
      });
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

    // Every page has its place in one queue, so however a view asks for them
    // (in order, or all at once), each is fetched once, a few at a time.
    const pages = new Map<number, Promise<Blob>>([[1, first.blob()]]);
    const starts: (() => void)[] = [];
    let inFlight = 0;
    let stopped = false;
    const pump = () => {
      while (!stopped && inFlight < PAGES_IN_FLIGHT && starts.length > 0) {
        inFlight += 1;
        starts.shift()!();
      }
    };
    for (let n = 2; n <= count; n++) {
      const page = new Promise<Blob>((resolve, reject) => {
        starts.push(() => {
          get(n)
            .then((res) => res.blob())
            .then(resolve, reject)
            .finally(() => {
              inFlight -= 1;
              pump();
            });
        });
      });
      page.catch(() => {}); // The view hears of it when it draws the page.
      pages.set(n, page);
    }
    pump();

    return {
      numPages: count,
      async renderPage(n, canvas, cssWidth) {
        const page = pages.get(n);
        if (!page) throw new Error(`There is no page ${n}`);
        const image = await decode(await page);
        try {
          const scale = Math.min(1, (cssWidth * DENSITY) / image.width);
          canvas.width = Math.round(image.width * scale);
          canvas.height = Math.round(image.height * scale);
          canvas.getContext("2d")?.drawImage(image.source, 0, 0, canvas.width, canvas.height);
        } finally {
          image.release();
        }
      },
      // No pageSize: asking every placeholder's size up front fetched all the
      // pages at once, around the queue, and the queue then fetched them again
      // (28 requests for 16 pages, live). Placeholders keep the default page
      // shape until their image arrives.
      destroy() {
        stopped = true;
        pages.clear();
      },
    } satisfies LoadedPdf;
  };
}
