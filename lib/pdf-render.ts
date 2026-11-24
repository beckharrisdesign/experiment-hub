/**
 * Draw one page of a PDF as a JPEG, on the server.
 * openspec/changes/pdf-metadata-viewer-cloud — task 7c.3.
 *
 * Why the server: measured live, Drive hands a 9.35 MB scan to the function
 * in under half a second once it starts, but the function sends it on to the
 * browser at about 0.85 MB/s. A page drawn here is 100–300 KB instead of the
 * megabytes of PDF pdf.js needs to draw it in the browser. Nothing is kept:
 * each image is drawn from Drive's bytes and sent, as the preview always was.
 */
import path from "node:path";
import { existsSync, readdirSync } from "node:fs";
import { createCanvas } from "@napi-rs/canvas";

/**
 * pdf.js's own runtime folders: standard fonts (for PDFs that name a font
 * without embedding it), WebAssembly decoders (JBIG2 and JPEG 2000, common in
 * scans) and colour profiles. pdf.js reads them by path, so file tracing can't
 * follow them; next.config.js traces them from the pnpm store, which is where
 * they are found when deployed. Locally the node_modules symlink works too.
 */
function pdfjsFolder(name: string): string | undefined {
  const modules = path.join(process.cwd(), "node_modules");
  const candidates = [path.join(modules, "pdfjs-dist", name)];
  try {
    for (const entry of readdirSync(path.join(modules, ".pnpm"))) {
      if (entry.startsWith("pdfjs-dist@")) {
        candidates.push(path.join(modules, ".pnpm", entry, "node_modules", "pdfjs-dist", name));
      }
    }
  } catch {
    // No pnpm store here: the symlinked path is all there is.
  }
  const dir = candidates.find((d) => existsSync(d));
  return dir ? `${dir}${path.sep}` : undefined;
}

/**
 * pdf.js in Node runs its worker in-process, loading it by a path it builds at
 * runtime, which file tracing can't follow either: deployed, every page failed
 * "Setting up fake worker failed: Cannot find module …/pdf.worker.mjs" (#636).
 * Importing it here by name makes tracing include it, and pdf.js uses it.
 */
async function loadPdfjs() {
  const g = globalThis as typeof globalThis & { pdfjsWorker?: unknown };
  if (!g.pdfjsWorker) g.pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  return import("pdfjs-dist/legacy/build/pdf.mjs");
}

export class PageOutOfRange extends Error {
  constructor(public readonly pageCount: number) {
    super(`This document has ${pageCount} ${pageCount === 1 ? "page" : "pages"}`);
    this.name = "PageOutOfRange";
  }
}

export interface RenderedPage {
  jpeg: Uint8Array;
  pageCount: number;
  width: number;
  height: number;
}

export async function renderPdfPage(
  bytes: ArrayBuffer | Uint8Array,
  pageNumber: number,
  width: number,
): Promise<RenderedPage> {
  const pdfjs = await loadPdfjs();
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const task = pdfjs.getDocument({
    data,
    useSystemFonts: false,
    standardFontDataUrl: pdfjsFolder("standard_fonts"),
    wasmUrl: pdfjsFolder("wasm"),
    iccUrl: pdfjsFolder("iccs"),
  });
  try {
    const doc = await task.promise;
    if (pageNumber > doc.numPages) throw new PageOutOfRange(doc.numPages);
    const page = await doc.getPage(pageNumber);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: width / base.width });
    const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
    const context = canvas.getContext("2d");
    // A page with no background of its own is white paper, not transparent.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;
    const jpeg = await canvas.encode("jpeg", 82);
    return { jpeg: new Uint8Array(jpeg), pageCount: doc.numPages, width: canvas.width, height: canvas.height };
  } finally {
    await task.destroy();
  }
}
