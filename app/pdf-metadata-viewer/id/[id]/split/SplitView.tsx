"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@beckharrisdesign/mvds";
import { partName, planParts } from "@/lib/pdf-split-plan";
import { loadWithPdfJs, type LoadedPdf, type PdfLoader } from "@/app/pdf-metadata-viewer/pdfjs";

/**
 * The interactive half of Split — Figma `02.11`, frames 69:9 (breaks chosen)
 * and 69:132 (no breaks yet).
 *
 * Every gap between two pages is a toggle: on, the document splits there. The
 * pages under each part carry one bar, labelled on the part's first page, and
 * the result panel lists the files a split would create. Nothing is written
 * until "Split into N files".
 */

export type { LoadedPdf, PdfLoader } from "@/app/pdf-metadata-viewer/pdfjs";

const THUMB_WIDTH = 148;

function Thumbnail({ pdf, pageNumber }: { pdf: LoadedPdf; pageNumber: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    pdf.renderPage(pageNumber, ref.current, THUMB_WIDTH).catch(() => setFailed(true));
  }, [pdf, pageNumber]);
  return failed ? (
    <div className="flex h-48 w-[148px] items-center justify-center rounded bg-white text-xs text-black/50">
      Couldn&apos;t draw
    </div>
  ) : (
    <canvas
      ref={ref}
      aria-label={`Page ${pageNumber}`}
      className="h-auto w-[148px] rounded bg-white"
    />
  );
}

type Status =
  | { kind: "loading" }
  | { kind: "ready"; pdf: LoadedPdf }
  | { kind: "unreadable"; message: string };

type Action =
  | { kind: "idle" }
  | { kind: "working"; what: "split" | "one-document" }
  | { kind: "error"; message: string; reauthorize?: boolean };

export function SplitView({
  documentId,
  filename,
  contentUrl,
  loadPdf = loadWithPdfJs,
}: {
  documentId: string;
  filename: string | null;
  contentUrl: string;
  loadPdf?: PdfLoader;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [breaks, setBreaks] = useState<number[]>([]);
  const [action, setAction] = useState<Action>({ kind: "idle" });

  useEffect(() => {
    let live = true;
    loadPdf(contentUrl)
      .then((pdf) => live && setStatus({ kind: "ready", pdf }))
      .catch(() => live && setStatus({ kind: "unreadable", message: "Couldn't load this PDF's pages. Try again in a moment." }));
    return () => {
      live = false;
    };
  }, [contentUrl, loadPdf]);

  if (status.kind === "loading") {
    return <main className="px-4 pt-6 text-sm text-text-muted lg:px-24">Loading pages…</main>;
  }
  if (status.kind === "unreadable") {
    return (
      <main className="px-4 pt-6 lg:px-24">
        <p role="alert" className="text-sm text-warning">{status.message}</p>
      </main>
    );
  }

  const pageCount = status.pdf.numPages;
  const sorted = [...breaks].sort((a, b) => a - b);
  const parts = sorted.length > 0 ? planParts(pageCount, sorted) : [[1, pageCount] as [number, number]];
  const partOf = (page: number) => parts.findIndex(([a, b]) => page >= a && page <= b);
  const busy = action.kind === "working";

  const toggle = (afterPage: number) =>
    setBreaks((current) =>
      current.includes(afterPage) ? current.filter((b) => b !== afterPage) : [...current, afterPage],
    );

  async function post(path: string, body: unknown, what: "split" | "one-document") {
    setAction({ kind: "working", what });
    try {
      const res = await fetch(`/api/pdf-documents/id/${documentId}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; reauthorize?: boolean };
      if (!res.ok) {
        setAction({ kind: "error", message: json.error ?? "Nothing changed. Try again.", reauthorize: json.reauthorize });
        return;
      }
      setAction({ kind: "idle" });
      // The new files are in the archive list; a single document goes back to its page.
      router.push(what === "split" ? "/pdf-metadata-viewer" : `/pdf-metadata-viewer/id/${documentId}`);
      router.refresh();
    } catch {
      setAction({ kind: "error", message: "Could not reach the server. Nothing changed." });
    }
  }

  const range = ([a, b]: [number, number]) => (a === b ? `page ${a}` : `pages ${a}–${b}`);

  return (
    <>
      <main className="flex flex-1 flex-col gap-6 px-4 pt-8 pb-8 lg:px-24">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-text-primary">
            Where does one document end and the next begin?
          </h2>
          <p className="text-sm text-text-muted">
            Click the gap between two pages to split there. Each part becomes its own file in Drive; the original
            stays, marked as replaced.
          </p>
        </div>

        <ol className="flex flex-wrap items-start gap-y-6" aria-label="Pages">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => {
            const part = partOf(page);
            const firstOfPart = parts[part][0] === page;
            const split = breaks.includes(page);
            return (
              <Fragment key={page}>
                <li className="flex flex-col items-center gap-2">
                  <Thumbnail pdf={status.pdf} pageNumber={page} />
                  <span className="text-xs text-text-muted">Page {page}</span>
                  <span
                    aria-hidden
                    className={`h-0.5 w-full rounded ${sorted.length > 0 ? "bg-accent-primary" : "bg-border"}`}
                  />
                  <span className="min-h-4 self-start text-xs font-medium text-text-secondary">
                    {firstOfPart
                      ? sorted.length > 0
                        ? `File ${part + 1} · ${range(parts[part])}`
                        : `One file · ${range(parts[0])}`
                      : ""}
                  </span>
                </li>
                {page < pageCount ? (
                  <li className="flex flex-col items-center">
                    <button
                      type="button"
                      aria-pressed={split}
                      aria-label={`Split after page ${page}`}
                      disabled={busy}
                      onClick={() => toggle(page)}
                      className="group flex h-48 w-11 flex-col items-center justify-center gap-1.5"
                    >
                      <span
                        aria-hidden
                        className={
                          split
                            ? "h-36 w-1 rounded bg-accent-primary"
                            : "h-36 w-px bg-border group-hover:w-0.5 group-hover:bg-accent-primary"
                        }
                      />
                      <span
                        aria-hidden
                        className={`text-[11px] font-medium ${split ? "text-accent-primary" : "text-text-muted group-hover:text-accent-primary"}`}
                      >
                        {split ? "split" : "+"}
                      </span>
                    </button>
                    {/* Joins the part's bar across a gap that isn't a split. */}
                    <span
                      aria-hidden
                      className={`mt-7 h-0.5 w-11 ${split ? "" : sorted.length > 0 ? "bg-accent-primary" : "bg-border"}`}
                    />
                  </li>
                ) : null}
              </Fragment>
            );
          })}
        </ol>

        <section className="flex flex-col gap-3 rounded-lg bg-background-secondary p-5" aria-live="polite">
          {sorted.length > 0 ? (
            <>
              <h3 className="text-sm font-semibold text-text-primary">
                Creates {parts.length} files in the same Drive folder
              </h3>
              <ul className="flex flex-col">
                {parts.map((p, i) => (
                  <li
                    key={i}
                    className="flex gap-4 border-t border-border py-2.5 text-sm first:border-t-0"
                  >
                    <span className="w-64 shrink-0 break-words text-text-primary">{partName(filename, i + 1)}</span>
                    <span className="text-text-muted">{range(p)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-text-muted">
                Each file starts with the original&apos;s title, subject and keywords. Tag each one after, or press
                Suggest on it.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-text-primary">No breaks yet</h3>
              <p className="text-xs text-text-muted">
                Click a gap between pages to split there. If this scan is one document, say so and it&apos;s
                recorded as one document.
              </p>
            </>
          )}
        </section>

        {action.kind === "error" ? (
          <p role="alert" className="text-sm text-warning">
            {action.message}{" "}
            {action.reauthorize ? (
              <a href="/api/pdf-drive/connect" className="underline">
                Sign in again
              </a>
            ) : null}
          </p>
        ) : null}
      </main>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-border bg-background-secondary px-4 py-4 lg:px-24">
        <Button
          variant="outline"
          className="min-h-11"
          disabled={busy}
          onClick={() => void post("/split/not-needed", {}, "one-document")}
        >
          It&apos;s one document
        </Button>
        <span className="flex-1" />
        {sorted.length > 0 ? (
          <Button variant="outline" className="min-h-11" disabled={busy} onClick={() => setBreaks([])}>
            Clear breaks
          </Button>
        ) : null}
        <Button
          className="min-h-11"
          disabled={busy || sorted.length === 0}
          onClick={() => void post("/split", { breaks: sorted }, "split")}
        >
          {action.kind === "working" && action.what === "split"
            ? "Splitting…"
            : sorted.length > 0
              ? `Split into ${parts.length} files`
              : "Choose where to split"}
        </Button>
      </div>
    </>
  );
}
