/**
 * pdf.js in the browser: the one loader the splitter and the detail preview
 * share. Loaded only on the pages that draw PDFs, and only in the browser.
 * openspec/changes/pdf-metadata-viewer-cloud — tasks 7b.1, 7c.3.
 */

/** What a view needs from a PDF; pdf.js in the browser, a stub in tests. */
export interface LoadedPdf {
  numPages: number;
  renderPage(pageNumber: number, canvas: HTMLCanvasElement, width: number): Promise<void>;
  /** A page's size in PDF points, so its place can be held before it's drawn. */
  pageSize?(pageNumber: number): Promise<{ width: number; height: number }>;
  destroy?(): void;
}

export type PdfLoader = (url: string) => Promise<LoadedPdf>;

/** One megabyte: a scan's first page usually sits in a chunk or two. */
export const CHUNK = 1 << 20;

/** The total size from `Content-Range: bytes 0-1048575/9807226`. */
export function totalFromContentRange(header: string | null): number | null {
  const total = header?.match(/\/(\d+)\s*$/)?.[1];
  return total ? Number(total) : null;
}

/** The parts of pdf.js's range transport this needs; a stub in tests. */
export interface RangeTransport {
  requestDataRange(begin: number, end: number): void;
  onDataRange(begin: number, chunk: Uint8Array): void;
}

type Source =
  | { data: Uint8Array }
  | { length: number; initial: Uint8Array; fetchRange: (begin: number, end: number) => Promise<Uint8Array> };

/**
 * Ask for the first chunk only. The reply says how big the file is, so pdf.js
 * can then ask for just the byte ranges a page needs, instead of the whole
 * file before it draws anything (task 7c.3). A server that ignores the range
 * sends the whole file, which is used as it is.
 */
export async function openRangedSource(url: string, fetchImpl: typeof fetch = fetch): Promise<Source> {
  const get = (range: string) =>
    fetchImpl(url, { headers: { Range: range }, credentials: "include", cache: "no-store" });
  const first = await get(`bytes=0-${CHUNK - 1}`);
  if (!first.ok) throw new Error(`The file couldn't be fetched (${first.status})`);
  const initial = new Uint8Array(await first.arrayBuffer());
  if (first.status !== 206) return { data: initial }; // the whole file, as sent
  const length = totalFromContentRange(first.headers.get("content-range"));
  if (length === null) {
    // Part of the file with no total: it can't be ranged, so take all of it.
    const whole = await fetchImpl(url, { credentials: "include", cache: "no-store" });
    if (!whole.ok) throw new Error(`The file couldn't be fetched (${whole.status})`);
    return { data: new Uint8Array(await whole.arrayBuffer()) };
  }
  if (initial.length >= length) return { data: initial };

  const fetchRange = async (begin: number, end: number) => {
    // Two tries: one dropped request shouldn't leave a page undrawn.
    for (let attempt = 0; ; attempt++) {
      try {
        const res = await get(`bytes=${begin}-${end - 1}`);
        if (!res.ok) throw new Error(String(res.status));
        const bytes = new Uint8Array(await res.arrayBuffer());
        // A whole file in reply to a range: take the part asked for.
        return res.status === 206 ? bytes : bytes.slice(begin, end);
      } catch (error) {
        if (attempt >= 1) throw error;
      }
    }
  };
  return { length, initial, fetchRange };
}

/** Wire a ranged source to pdf.js's transport: each request is fetched and handed back. */
export function connectTransport(
  transport: RangeTransport,
  fetchRange: (begin: number, end: number) => Promise<Uint8Array>,
  onError: (error: unknown) => void = () => {},
) {
  transport.requestDataRange = (begin, end) => {
    fetchRange(begin, end).then((chunk) => transport.onDataRange(begin, chunk), onError);
  };
}

export const loadWithPdfJs: PdfLoader = async (url) => {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const source = await openRangedSource(url);
  let task;
  if ("data" in source) {
    task = pdfjs.getDocument({ data: source.data });
  } else {
    const transport = new pdfjs.PDFDataRangeTransport(source.length, source.initial);
    connectTransport(transport, source.fetchRange, (error) =>
      console.error("pdf preview: a byte range couldn't be fetched:", error),
    );
    task = pdfjs.getDocument({
      range: transport,
      rangeChunkSize: CHUNK,
      // Fetch only what a drawn page needs; pages are drawn in order anyway.
      disableAutoFetch: true,
      disableStream: true,
    });
  }
  const doc = await task.promise;
  return {
    numPages: doc.numPages,
    async renderPage(pageNumber, canvas, width) {
      const page = await doc.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: (width / base.width) * (window.devicePixelRatio || 1) });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvas, viewport }).promise;
    },
    async pageSize(pageNumber) {
      const viewport = (await doc.getPage(pageNumber)).getViewport({ scale: 1 });
      return { width: viewport.width, height: viewport.height };
    },
    // In this pdf.js the loading task, not the document, owns the teardown.
    destroy() {
      void task.destroy();
    },
  };
};
