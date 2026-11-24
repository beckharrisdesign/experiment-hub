"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadWithPdfJs, type LoadedPdf, type PdfLoader } from "@/app/pdf-metadata-viewer/pdfjs";

/**
 * The detail page's preview: the document's pages as images, drawn with
 * pdf.js. Figma `02.12` — frames 73:44 (pages drawn), 73:104 (loading),
 * 73:164 (phone). openspec/changes/pdf-metadata-viewer-cloud — task 7c.3.
 *
 * Replaces an <iframe> of the content route, which handed the file to the
 * browser's own PDF viewer (its toolbar, its page sidebar). Pages are drawn in
 * order, first page first; a page not yet drawn holds its place at its own
 * size, so nothing jumps. "Open full size" still opens the browser's viewer.
 */

const PAGE_WIDTH = 560;

type Status =
  | { kind: "loading" }
  | { kind: "ready"; pdf: LoadedPdf }
  | { kind: "failed" };

function PageImage({
  pdf,
  pageNumber,
  filename,
  drawNow,
  onSettled,
}: {
  pdf: LoadedPdf;
  pageNumber: number;
  filename: string;
  /** Pages are drawn one after another; this one's turn has come. */
  drawNow: boolean;
  onSettled: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [state, setState] = useState<"waiting" | "drawn" | "failed">("waiting");

  useEffect(() => {
    let live = true;
    pdf.pageSize?.(pageNumber).then((s) => live && setSize(s)).catch(() => {});
    return () => {
      live = false;
    };
  }, [pdf, pageNumber]);

  useEffect(() => {
    if (!drawNow || state !== "waiting" || !canvas.current) return;
    let live = true;
    // The state change re-runs this effect, which ends `live`; so the next
    // page is released in the same callback, never after it.
    const settle = (next: "drawn" | "failed") => {
      if (!live) return;
      setState(next);
      onSettled();
    };
    pdf.renderPage(pageNumber, canvas.current, PAGE_WIDTH).then(
      () => settle("drawn"),
      () => settle("failed"),
    );
    return () => {
      live = false;
    };
  }, [pdf, pageNumber, drawNow, state, onSettled]);

  return (
    <>
      {/* Drawn into while hidden, then shown whole. */}
      <canvas
        ref={canvas}
        role="img"
        aria-label={`Page ${pageNumber} of ${filename}`}
        className={state === "drawn" ? "block h-auto w-full rounded bg-white" : "hidden"}
      />
      {state === "drawn" ? null : (
        <div
          className="flex w-full items-center justify-center rounded bg-background-secondary text-xs text-text-muted"
          style={{ aspectRatio: size ? `${size.width} / ${size.height}` : "8.5 / 11" }}
        >
          {state === "failed" ? `Couldn't draw page ${pageNumber}` : `Drawing page ${pageNumber}…`}
        </div>
      )}
    </>
  );
}

export function PagePreview({
  documentId,
  contentUrl,
  filename,
  storedPageCount,
  wasSplit,
  frameClass,
  loadPdf = loadWithPdfJs,
}: {
  documentId: string;
  contentUrl: string;
  filename: string;
  /** Known before the file arrives (baseline or saved read); offers Split early. */
  storedPageCount: number | null;
  wasSplit: boolean;
  /** The preview's height on the page, shared with the server layout. */
  frameClass: string;
  loadPdf?: PdfLoader;
}) {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [drawn, setDrawn] = useState(0);
  const [current, setCurrent] = useState(1);
  const scroller = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    let live = true;
    let loaded: LoadedPdf | null = null;
    loadPdf(contentUrl)
      .then((pdf) => {
        loaded = pdf;
        if (live) setStatus({ kind: "ready", pdf });
        else pdf.destroy?.();
      })
      .catch(() => live && setStatus({ kind: "failed" }));
    return () => {
      live = false;
      loaded?.destroy?.();
    };
  }, [contentUrl, loadPdf]);

  const settled = useCallback(() => setDrawn((n) => n + 1), []);

  // The page in view is the last one whose top has passed the upper third.
  const onScroll = () => {
    const box = scroller.current;
    if (!box) return;
    const line = box.scrollTop + box.clientHeight / 3;
    let inView = 1;
    pageRefs.current.forEach((el, i) => {
      if (el && el.offsetTop - box.offsetTop <= line) inView = i + 1;
    });
    setCurrent(inView);
  };

  const numPages = status.kind === "ready" ? status.pdf.numPages : null;
  const pageCount = numPages ?? storedPageCount;
  const splitUrl = `/pdf-metadata-viewer/id/${documentId}/split`;

  return (
    <>
      <div
        ref={scroller}
        onScroll={onScroll}
        className={`${frameClass} overflow-y-auto`}
        aria-label="Pages"
        aria-busy={status.kind === "loading"}
      >
        {status.kind === "loading" ? (
          <div className="mx-auto flex aspect-[8.5/11] w-full max-w-[560px] items-center justify-center rounded bg-background-secondary text-xs text-text-muted">
            Loading pages…
          </div>
        ) : status.kind === "failed" ? (
          <div
            role="alert"
            className="mx-auto flex aspect-[8.5/11] w-full max-w-[560px] items-center justify-center rounded bg-background-secondary p-6 text-center text-xs text-text-muted"
          >
            Couldn&apos;t draw this file&apos;s pages. Open it full size instead.
          </div>
        ) : (
          <ol className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
            {Array.from({ length: status.pdf.numPages }, (_, i) => i + 1).map((n) => (
              <li
                key={n}
                ref={(el) => {
                  pageRefs.current[n - 1] = el;
                }}
              >
                <PageImage
                  pdf={status.pdf}
                  pageNumber={n}
                  filename={filename}
                  drawNow={n <= drawn + 1}
                  onSettled={settled}
                />
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="mx-auto flex w-full max-w-[560px] items-center gap-4 text-xs">
        <span className="text-text-muted">{numPages ? `Page ${current} of ${numPages}` : ""}</span>
        <span className="flex-1" />
        {wasSplit ? (
          <a href={splitUrl} className="inline-flex min-h-11 items-center text-warning hover:underline">
            Split into parts — see them
          </a>
        ) : pageCount !== null && pageCount > 1 ? (
          <a href={splitUrl} className="inline-flex min-h-11 items-center text-text-secondary hover:underline">
            Split pages
          </a>
        ) : null}
        <a
          href={contentUrl}
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-11 items-center text-text-secondary hover:underline"
        >
          Open full size
        </a>
      </div>
    </>
  );
}
