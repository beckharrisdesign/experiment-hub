"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@beckharrisdesign/mvds";

/**
 * A "Split first?" row, opened in the list — Figma `02.18`, frames 89:484 and
 * 89:967 (phone). openspec/changes/pdf-metadata-viewer-cloud — task 7j.
 *
 * The question and its buttons are there at once and never wait for a page. The
 * pages are the small kept copies, fetched as they come into view; one that isn't
 * kept keeps its empty place, as drawing it would take longer than opening the
 * document.
 */

/** Pages past the edge of the strip worth having ready. */
const AHEAD = "0px 220px";

interface SplitPeekProps {
  id: string;
  documentId: string;
  filename: string;
  pageCount: number;
  /** The revision Drive last listed; finds its kept pages. Null: no pictures. */
  revision: string | null;
  splitUrl: string;
}

interface PeekPageProps {
  src: string | null;
  page: number;
  strip: React.RefObject<HTMLOListElement | null>;
}

function PeekPage({ src, page, strip }: PeekPageProps) {
  const place = useRef<HTMLLIElement>(null);
  // Opened by a press, so this is always the browser.
  const [near, setNear] = useState(() => typeof IntersectionObserver === "undefined");
  const [state, setState] = useState<"waiting" | "shown" | "none">("waiting");

  useEffect(() => {
    if (near || !src || !place.current) return;
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setNear(true), {
      root: strip.current,
      rootMargin: AHEAD,
    });
    observer.observe(place.current);
    return () => observer.disconnect();
  }, [near, src, strip]);

  return (
    <li ref={place} className="flex w-24 shrink-0 flex-col items-center gap-1">
      <div className="h-[124px] w-full overflow-hidden rounded bg-background-primary">
        {near && src && state !== "none" ? (
          // eslint-disable-next-line @next/next/no-img-element -- private, uncached page image
          <img
            src={src}
            alt={`Page ${page}`}
            onLoad={() => setState("shown")}
            onError={() => setState("none")}
            className={state === "shown" ? "size-full bg-white object-cover object-top" : "invisible"}
          />
        ) : null}
      </div>
      <span className="text-[11px] text-text-primary">{page}</span>
    </li>
  );
}

export default function SplitPeek({ id, documentId, filename, pageCount, revision, splitUrl }: SplitPeekProps) {
  const router = useRouter();
  const strip = useRef<HTMLOListElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function oneDocument() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pdf-documents/id/${documentId}/split/not-needed`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Not saved. Try again.");
        setBusy(false);
        return;
      }
      // Stays busy: the refreshed list no longer asks, and takes this with it.
      router.refresh();
    } catch {
      setError("Could not reach the server. Nothing changed.");
      setBusy(false);
    }
  }

  const src = (page: number) =>
    revision
      ? `/api/pdf-documents/id/${documentId}/pages/${page}?rev=${encodeURIComponent(revision)}&size=thumb&kept=1`
      : null;

  return (
    <section id={id} aria-label={`Split ${filename}?`} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-sans text-sm font-semibold text-text-primary">{pageCount} pages. Is this more than one document?</h3>
        <div className="order-last ml-auto flex flex-wrap justify-end gap-2 lg:order-none">
          <Button variant="secondary" className="min-h-11 bg-background-primary" disabled={busy} onClick={() => void oneDocument()}>
            {busy ? "Saving…" : "It's one document"}
          </Button>
          <Button asChild className="min-h-11">
            <a href={splitUrl}>Split pages</a>
          </Button>
        </div>
        {error ? (
          <p role="alert" className="w-full text-xs text-warning">
            {error}
          </p>
        ) : null}
        <ol
          ref={strip}
          aria-label="Pages"
          tabIndex={0}
          className="flex w-full gap-2 overflow-x-auto pb-1 lg:order-last"
        >
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => (
            <PeekPage key={page} page={page} src={src(page)} strip={strip} />
          ))}
        </ol>
      </div>
    </section>
  );
}
