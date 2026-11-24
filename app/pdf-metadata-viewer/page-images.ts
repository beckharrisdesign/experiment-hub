import { loadWithPdfJs, type LoadedPdf, type PdfLoader } from "@/app/pdf-metadata-viewer/pdfjs";

/**
 * Pages drawn on the server, as the source for the detail preview (task 7c.3)
 * and the splitter's thumbnails (task 7f).
 *
 * `GET …/pages/N` returns page N as a JPEG and the page count in
 * `X-Page-Count`. Page 1 comes first and says how many there are; any other is
 * fetched when a view asks to draw it, so what isn't looked at isn't sent (task
 * 7f.5). Where small copies are kept, page 1's comes first of all, and any
 * page's can be shown while the page itself is on its way. Should the server not manage a file (a PDF its pdf.js can't draw), the
 * browser's pdf.js takes over, as before.
 *
 * The JPEGs are held as they came and decoded only to be drawn: decoded, a
 * 100-page scan would take hundreds of megabytes.
 */

/** Pages in flight at once, however many a view asks for. */
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

async function draw(blob: Blob, canvas: HTMLCanvasElement, cssWidth: number): Promise<void> {
  const image = await decode(blob);
  try {
    const scale = Math.min(1, (cssWidth * DENSITY) / image.width);
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    canvas.getContext("2d")?.drawImage(image.source, 0, 0, canvas.width, canvas.height);
  } finally {
    image.release();
  }
}

export function serverPageLoader(
  pagesBase: string,
  width: number,
  fallback: PdfLoader = loadWithPdfJs,
  fetchImpl: typeof fetch = (...args) => fetch(...args),
  /** The Drive revision on screen, which finds its kept images (task 7f). */
  revision: string | null = null,
  /** Small copies, for a screen of thumbnails. */
  { thumbs = false }: { thumbs?: boolean } = {},
): PdfLoader {
  const rev = revision ? `&rev=${encodeURIComponent(revision)}` : "";
  const size = thumbs ? "&size=thumb" : "";
  return async (contentUrl) => {
    const get = async (n: number) => {
      const res = await fetchImpl(`${pagesBase}/${n}?w=${width}${rev}${size}`, {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Page ${n} couldn't be drawn (${res.status})`);
      return res;
    };

    const countOf = (res: Response) => {
      const n = Number(res.headers.get("x-page-count"));
      return Number.isInteger(n) && n >= 1 ? n : null;
    };

    // A kept small copy, or null. Never drawn for this: drawing one takes as
    // long as drawing the page it would stand in for.
    const small = async (n: number): Promise<Response | null> => {
      const res = await fetchImpl(`${pagesBase}/${n}?w=${width}${rev}&size=thumb&kept=1`, {
        cache: "no-store",
        credentials: "include",
      });
      return res.status === 200 ? res : null;
    };
    const previews = new Map<number, Promise<Blob>>();
    const pages = new Map<number, Promise<Blob>>();

    let count: number | null = null;
    if (revision && !thumbs) {
      const look = await small(1).catch(() => null);
      count = look && countOf(look);
      if (look && count) previews.set(1, look.blob());
    }
    const quick = count !== null;
    if (!count) {
      let first: Response;
      try {
        first = await get(1);
      } catch {
        return fallback(contentUrl);
      }
      count = countOf(first);
      if (!count) return fallback(contentUrl);
      pages.set(1, first.blob());
    }
    const pageCount = count;

    // Each page is fetched once, when first asked for, a few at a time.
    const starts: (() => void)[] = [];
    let inFlight = 0;
    let stopped = false;
    const pump = () => {
      while (!stopped && inFlight < PAGES_IN_FLIGHT && starts.length > 0) {
        inFlight += 1;
        starts.shift()!();
      }
    };
    const pageAt = (n: number) => {
      let page = pages.get(n);
      if (!page) {
        page = new Promise<Blob>((resolve, reject) => {
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
        pages.set(n, page);
        pump();
      }
      return page;
    };

    return {
      numPages: pageCount,
      async renderPage(n, canvas, cssWidth) {
        if (n < 1 || n > pageCount) throw new Error(`There is no page ${n}`);
        await draw(await pageAt(n), canvas, cssWidth);
      },
      previewPage: quick
        ? async (n, canvas, cssWidth) => {
            let look = previews.get(n);
            if (!look) {
              look = small(n).then((res) => res?.blob() ?? Promise.reject(new Error("No small copy")));
              previews.set(n, look);
            }
            await draw(await look, canvas, cssWidth);
          }
        : undefined,
      // No pageSize: asking every placeholder's size up front fetched all the
      // pages at once, around the queue, and the queue then fetched them again
      // (28 requests for 16 pages, live). Placeholders keep the default page
      // shape until their image arrives.
      destroy() {
        stopped = true;
        pages.clear();
        previews.clear();
      },
    } satisfies LoadedPdf;
  };
}
