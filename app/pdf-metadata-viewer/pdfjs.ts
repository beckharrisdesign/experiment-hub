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

  const fetchBytes = async (begin: number, end: number) => {
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
  return { length, initial, fetchRange: chunkedFetcher(length, initial, fetchBytes) };
}

/** How many chunks to fetch ahead of the one asked for, and at most at once. */
export const AHEAD = 3;
export const MAX_AHEAD_IN_FLIGHT = 4;

/**
 * Serve pdf.js's range requests from 1 MB chunks fetched ahead, side by side.
 *
 * Each request through the preview route costs 2–4 s, mostly the round trip
 * to Drive rather than the bytes, and pdf.js asks for one chunk at a time. So
 * as soon as the size is known, the end of the file (where a scan's page
 * index lives) and the next chunks are fetched at once; each chunk pdf.js
 * asks for starts the next few behind it. A chunk is dropped once delivered:
 * pdf.js keeps its own copy.
 */
export function chunkedFetcher(
  length: number,
  initial: Uint8Array,
  fetchBytes: (begin: number, end: number) => Promise<Uint8Array>,
): (begin: number, end: number) => Promise<Uint8Array> {
  const count = Math.ceil(length / CHUNK);
  const chunks = new Map<number, Promise<Uint8Array>>([[0, Promise.resolve(initial.subarray(0, CHUNK))]]);
  const delivered = new Set<number>();
  let ahead = 0; // prefetches still in flight
  let windowEnd = AHEAD; // fetch ahead up to this chunk

  const start = (i: number) => {
    let chunk = chunks.get(i);
    if (!chunk) {
      chunk = fetchBytes(i * CHUNK, Math.min((i + 1) * CHUNK, length));
      chunks.set(i, chunk);
      // A prefetch that fails is fetched again when it's actually asked for.
      chunk.catch(() => chunks.delete(i));
    }
    return chunk;
  };
  // Fill free slots with the next chunks not yet fetched, up to the window.
  const pump = () => {
    for (let i = 1; i <= Math.min(windowEnd, count - 1) && ahead < MAX_AHEAD_IN_FLIGHT; i++) {
      if (chunks.has(i) || delivered.has(i)) continue;
      ahead += 1;
      const done = () => {
        ahead -= 1;
        pump();
      };
      start(i).then(done, done);
    }
  };

  // The end of the file first: a scan's page index lives there.
  if (count > 1) {
    ahead += 1;
    const done = () => {
      ahead -= 1;
      pump();
    };
    start(count - 1).then(done, done);
  }
  pump();

  return async (begin, end) => {
    const first = Math.floor(begin / CHUNK);
    const last = Math.floor((end - 1) / CHUNK);
    const wanted: Promise<Uint8Array>[] = [];
    for (let i = first; i <= last; i++) wanted.push(start(i));
    windowEnd = Math.max(windowEnd, last + AHEAD);
    pump();
    const parts = await Promise.all(wanted);
    for (let i = first; i <= last; i++) {
      chunks.delete(i);
      delivered.add(i);
    }
    const joined = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let at = 0;
    for (const p of parts) {
      joined.set(p, at);
      at += p.length;
    }
    const offset = first * CHUNK;
    return joined.subarray(begin - offset, end - offset);
  };
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
