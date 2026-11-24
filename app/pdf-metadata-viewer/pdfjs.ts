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

export const loadWithPdfJs: PdfLoader = async (url) => {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const task = pdfjs.getDocument({ url, withCredentials: true });
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
