"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LoadedPdf, PdfLoader } from "@/app/pdf-metadata-viewer/pdfjs";
import { serverPageLoader } from "@/app/pdf-metadata-viewer/page-images";

/**
 * The detail page's preview: the document's pages as images, drawn with
 * pdf.js. Figma `02.12` — frames 73:44 (pages drawn), 73:104 (loading),
 * 73:164 (phone). openspec/changes/pdf-metadata-viewer-cloud — task 7c.3.
 *
 * Replaces an <iframe> of the content route, which handed the file to the
 * browser's own PDF viewer (its toolbar, its page sidebar). Pages are fetched
 * and drawn as they come near the screen, the one being looked at first (task
 * 7f.5): a long scan used to send every page, and mostly two are looked at. Its
 * small copy shows first where there is one, and sharpens into the page. A page not yet drawn holds its place at the first page's shape, so little jumps. "Open full size" still opens the browser's viewer.
 */

const PAGE_WIDTH = 560;

/** Pages being drawn at once: the one in view, and the next. */
const DRAWING_AT_ONCE = 2;

type Status =
  | { kind: "loading" }
  | { kind: "ready"; pdf: LoadedPdf }
  | { kind: "failed" };

function PageImage({
  pdf,
  pageNumber,
  filename,
  near,
  drawNow,
  shape,
  onSettled,
}: {
  pdf: LoadedPdf;
  pageNumber: number;
  filename: string;
  /** Near the screen: worth a quick look. */
  near: boolean;
  /** Near the screen, and its turn has come. */
  drawNow: boolean;
  /** The first page drawn, to hold a place by until this one is. */
  shape: string;
  onSettled: (page: number, shape?: string) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const quick = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"waiting" | "drawn" | "failed">("waiting");
  const [glimpsed, setGlimpsed] = useState(false);

  useEffect(() => {
    let live = true;
    pdf.pageSize?.(pageNumber).then((s) => live && setSize(s)).catch(() => {});
    return () => {
      live = false;
    };
  }, [pdf, pageNumber]);

  // On a canvas of its own, so it can never land on top of the page itself.
  useEffect(() => {
    if (!near || glimpsed || state !== "waiting" || !pdf.previewPage || !quick.current) return;
    let live = true;
    pdf.previewPage(pageNumber, quick.current, PAGE_WIDTH).then(
      () => live && setGlimpsed(true),
      () => {}, // No small copy: the placeholder stays until the page is drawn.
    );
    return () => {
      live = false;
    };
  }, [pdf, pageNumber, near, glimpsed, state]);

  useEffect(() => {
    if (!drawNow || state !== "waiting" || !canvas.current) return;
    let live = true;
    const target = canvas.current;
    // The state change re-runs this effect, which ends `live`; so the next
    // page is released in the same callback, never after it.
    const settle = (next: "drawn" | "failed") => {
      if (!live) return;
      setState(next);
      onSettled(
        pageNumber,
        next === "drawn" && target.width && target.height ? `${target.width} / ${target.height}` : undefined,
      );
    };
    pdf.renderPage(pageNumber, target, PAGE_WIDTH).then(
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
      <canvas
        ref={quick}
        aria-hidden
        className={glimpsed && state === "waiting" ? "block h-auto w-full rounded bg-white" : "hidden"}
      />
      {state === "drawn" || (glimpsed && state === "waiting") ? null : (
        <div
          className="flex w-full items-center justify-center rounded bg-background-secondary text-xs text-text-muted"
          style={{ aspectRatio: size ? `${size.width} / ${size.height}` : shape }}
        >
          {state === "failed" ? `Couldn't draw page ${pageNumber}` : `Drawing page ${pageNumber}…`}
        </div>
      )}
    </>
  );
}

export function PagePreview({
  documentId,
  listQuery = "",
  revision = null,
  contentUrl,
  filename,
  storedPageCount,
  wasSplit,
  frameClass,
  loadPdf,
}: {
  documentId: string;
  /** The list to go back to, as its query string ("" or "?…"). */
  listQuery?: string;
  /** Drive's revision as the page found it; finds its kept images. */
  revision?: string | null;
  contentUrl: string;
  filename: string;
  /** Known before the file arrives (baseline or saved read); offers Split early. */
  storedPageCount: number | null;
  wasSplit: boolean;
  /** The preview's height on the page, shared with the server layout. */
  frameClass: string;
  /** Pages drawn on the server by default (falling back to pdf.js); a stub in tests. */
  loadPdf?: PdfLoader;
}) {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [settledPages, setSettledPages] = useState<ReadonlySet<number>>(new Set());
  const [near, setNear] = useState<ReadonlySet<number>>(new Set([1]));
  const [shape, setShape] = useState("8.5 / 11");
  const [current, setCurrent] = useState(1);
  const scroller = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLLIElement | null)[]>([]);

  // The page's width on screen, in device pixels, so images come back sharp.
  const load = useMemo<PdfLoader>(
    () =>
      loadPdf ??
      serverPageLoader(
        `/api/pdf-documents/id/${documentId}/pages`,
        Math.round(PAGE_WIDTH * (typeof window === "undefined" ? 2 : Math.min(window.devicePixelRatio || 1, 2.5))),
        undefined,
        undefined,
        revision,
      ),
    [loadPdf, documentId, revision],
  );

  useEffect(() => {
    let live = true;
    let loaded: LoadedPdf | null = null;
    load(contentUrl)
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
  }, [contentUrl, load]);

  const settled = useCallback((page: number, drawnShape?: string) => {
    setSettledPages((pages) => new Set(pages).add(page));
    if (page === 1 && drawnShape) setShape(drawnShape);
  }, []);

  // The page in view is the last one whose top has passed the upper third. The
  // pages near it are those within a screen either way.
  const look = useCallback(() => {
    const box = scroller.current;
    // Not laid out (hidden): there is nothing to go by yet.
    if (!box || box.clientHeight === 0) return;
    const line = box.scrollTop + box.clientHeight / 3;
    const from = box.scrollTop - box.clientHeight;
    const to = box.scrollTop + 2 * box.clientHeight;
    let inView = 1;
    const close = new Set<number>();
    pageRefs.current.forEach((el, i) => {
      if (!el) return;
      const top = el.offsetTop - box.offsetTop;
      if (top <= line) inView = i + 1;
      if (top <= to && top + el.offsetHeight >= from) close.add(i + 1);
    });
    setCurrent(inView);
    setNear((was) => (was.size === close.size && [...close].every((n) => was.has(n)) ? was : close));
  }, []);

  // Also once there are pages to look at, and as they take their real heights.
  const ready = status.kind === "ready";
  useEffect(() => {
    if (ready) look();
  }, [ready, settledPages, shape, look]);

  // A window resized, or a phone turned, changes what's on screen too.
  useEffect(() => {
    window.addEventListener("resize", look);
    return () => window.removeEventListener("resize", look);
  }, [look]);

  // Of the pages near the screen, the closest to the one in view go first. One
  // that loses its turn to scrolling isn't wasted: it is fetched only once.
  const drawing = useMemo(
    () =>
      new Set(
        [...near]
          .filter((n) => !settledPages.has(n))
          .sort((a, b) => Math.abs(a - current) - Math.abs(b - current) || a - b)
          .slice(0, DRAWING_AT_ONCE),
      ),
    [near, settledPages, current],
  );

  const numPages = status.kind === "ready" ? status.pdf.numPages : null;
  const pageCount = numPages ?? storedPageCount;
  const splitUrl = `/pdf-metadata-viewer/id/${documentId}/split${listQuery}`;

  return (
    <>
      <div
        ref={scroller}
        onScroll={look}
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
                  near={near.has(n)}
                  drawNow={drawing.has(n)}
                  shape={shape}
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
