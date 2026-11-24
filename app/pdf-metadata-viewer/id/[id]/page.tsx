import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Button } from "@beckharrisdesign/mvds";
import {
  getPdfDocument,
  isUuid,
  listPdfDocuments,
  type PdfDocument,
} from "@/lib/pdf-documents";
import { getDriveConnection } from "@/lib/pdf-drive";
import { checkFile, readFile, type Access, type FileState, type Problem } from "@/lib/pdf-file-read";
import { summarizePending } from "@/lib/pdf-staging";
import { DetailsEditor } from "./DetailsEditor";

/**
 * Hosted pdf-metadata-viewer — document detail.
 * openspec/changes/pdf-metadata-viewer-cloud — Figma `02.9` frame `34:289`
 * (desktop) and `02.10` frame `40:3` (phone).
 *
 * Fields are editable and save as staged edits (task 8.1): saved here, not yet
 * in the file. The commit bar writes them into the PDF in Drive (task 8.2).
 *
 * Until a document's first edit, its stored fields are unread nulls and the
 * page shows what the file itself says. From the first edit on, the stored
 * fields are authoritative (design.md D8, "captured on first edit").
 *
 * Loading: the header and layout render from the database alone. Drive is
 * read inside two Suspense boundaries, so the page appears at once:
 *
 * - the preview waits only for a metadata read (is the file still there?);
 * - the details panel waits for what the file says, which is read from Drive
 *   only when the stored baseline may be stale. Once a document has a baseline
 *   and Drive still holds that revision, nothing is downloaded at all.
 *
 * Gated by middleware.ts, which returns before this renders.
 */
export const dynamic = "force-dynamic";

const FILE_PROBLEM: Record<Problem, { heading: string; body: string }> = {
  reauthorize: {
    heading: "Drive access needs re-authorizing",
    body: "Sign in again to see this file. Its details here are unaffected.",
  },
  missing: {
    heading: "This file is no longer in Google Drive",
    body: "It may have been moved, deleted or put in the trash. Its details and history here are kept.",
  },
  unreadable: {
    heading: "Could not read this file from Drive",
    body: "Try again in a moment. Its details here are unaffected.",
  },
};

const LOCKED_SPLIT = "This scan was split into parts. Edit the parts instead.";

// On wide screens the page fits one screen: 185px is the app bar (53), this
// view's header (76) and the page-count row with its gap (56). Measured on the
// live page; adjust if any of those change.
const FRAME = "h-[420px] w-full rounded-md lg:h-[calc(100vh-185px)]";

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

function PreviewFooter({
  document,
  pageCount,
  contentUrl,
}: {
  document: PdfDocument;
  pageCount: number | null;
  contentUrl: string;
}) {
  return (
    <div className="flex items-center justify-between text-xs text-text-muted">
      <span className="flex items-center gap-4">
        <span>
          {pageCount === null ? "" : `${pageCount} ${pageCount === 1 ? "page" : "pages"}`}
        </span>
        {/* Split (Figma 02.11): offered for any multi-page scan not already split. */}
        {document.supersededAt ? (
          <a
            href={`/pdf-metadata-viewer/id/${document.id}/split`}
            className="inline-flex min-h-11 items-center text-warning hover:underline"
          >
            Split into parts — see them
          </a>
        ) : pageCount !== null && pageCount > 1 ? (
          <a
            href={`/pdf-metadata-viewer/id/${document.id}/split`}
            className="inline-flex min-h-11 items-center text-text-secondary hover:underline"
          >
            Split pages
          </a>
        ) : null}
      </span>
      <a
        href={contentUrl}
        target="_blank"
        rel="noopener"
        className="inline-flex min-h-11 items-center text-text-secondary hover:underline"
      >
        Open full size
      </a>
    </div>
  );
}

/** The page count comes from the file only when it isn't stored yet. */
async function PreviewFooterFromFile({
  document,
  file,
  contentUrl,
}: {
  document: PdfDocument;
  file: Promise<FileState>;
  contentUrl: string;
}) {
  const state = await file;
  const pageCount = state.ok ? (state.embedded.pageCount ?? null) : null;
  return <PreviewFooter document={document} pageCount={pageCount} contentUrl={contentUrl} />;
}

async function Preview({
  document,
  access,
  file,
  filename,
  contentUrl,
}: {
  document: PdfDocument;
  access: Promise<Access>;
  file: Promise<FileState>;
  filename: string;
  contentUrl: string;
}) {
  const state = await access;
  if (!state.ok) {
    return (
      <div className="rounded-lg border-l-2 border-warning bg-background-secondary p-4">
        <div className="flex flex-col gap-2">
          <span className="font-semibold text-warning">{FILE_PROBLEM[state.reason].heading}</span>
          <span className="text-sm text-text-muted">{FILE_PROBLEM[state.reason].body}</span>
          {state.reason === "reauthorize" ? (
            <div>
              <Button asChild size="sm">
                <a href="/api/pdf-drive/connect">Sign in again</a>
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }
  const footerNow = (
    <PreviewFooter document={document} pageCount={document.pageCount} contentUrl={contentUrl} />
  );
  return (
    <>
      <iframe
        // A commit uploads a new revision at the same URL; remount so the
        // preview shows the file as it now is.
        key={document.driveRevisionId ?? "initial"}
        src={contentUrl}
        title={`Preview of ${filename}`}
        className={`${FRAME} bg-white`}
      />
      {document.pageCount !== null ? (
        footerNow
      ) : (
        <Suspense fallback={footerNow}>
          <PreviewFooterFromFile document={document} file={file} contentUrl={contentUrl} />
        </Suspense>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Details
// ---------------------------------------------------------------------------

async function Details({
  document,
  file,
}: {
  document: PdfDocument;
  file: Promise<FileState>;
}) {
  const state = await file;
  const embedded = state.ok ? state.embedded : undefined;
  const baselined = document.fileBaseline !== null;
  const values = baselined
    ? document
    : {
        title: document.title ?? embedded?.title ?? null,
        subject: document.subject ?? embedded?.subject ?? null,
        author: document.author ?? embedded?.author ?? null,
        keywords: document.keywords.length > 0 ? document.keywords : (embedded?.keywords ?? []),
      };
  const pending = summarizePending(document);
  return (
    <DetailsEditor
      documentId={document.id}
      values={{
        title: values.title,
        subject: values.subject,
        author: values.author,
        keywords: values.keywords,
      }}
      inFile={embedded}
      edited={{
        fields: pending.fields,
        keywordsAdded: pending.keywordsAdded,
        keywordsRemoved: pending.keywordsRemoved,
      }}
      disabled={!state.ok && !baselined}
      pendingCount={pending.count}
      locked={document.supersededAt ? LOCKED_SPLIT : undefined}
    />
  );
}

/** Shown while the file is read: the stored values, not yet editable. */
function DetailsWaiting({ document }: { document: PdfDocument }) {
  const pending = summarizePending(document);
  return (
    <DetailsEditor
      documentId={document.id}
      values={{
        title: document.title,
        subject: document.subject,
        author: document.author,
        keywords: document.keywords,
      }}
      inFile={undefined}
      edited={{
        fields: pending.fields,
        keywordsAdded: pending.keywordsAdded,
        keywordsRemoved: pending.keywordsRemoved,
      }}
      disabled
      pendingCount={pending.count}
      locked={document.supersededAt ? LOCKED_SPLIT : "Reading the file from Drive…"}
    />
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PdfDocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const [{ folder }, document] = await Promise.all([getDriveConnection(), getPdfDocument(id)]);
  if (!document) notFound();

  // Started now, awaited inside the Suspense boundaries below. Neither rejects.
  const access = checkFile(document);
  const file = access.then((state) => readFile(document, state));

  const all = await listPdfDocuments(folder?.id ?? null);

  // Previous/next follow the dashboard's own order, so stepping through here
  // walks the same list the user just left.
  const index = all.findIndex((d) => d.id === document.id);
  const previous = index > 0 ? all[index - 1] : null;
  const next = index >= 0 && index < all.length - 1 ? all[index + 1] : null;

  const pending = summarizePending(document);
  const contentUrl = `/api/pdf-documents/id/${document.id}/content`;
  const filename = document.filename ?? "(unnamed)";

  const stepLink = (target: PdfDocument | null, label: string, glyph: string) =>
    target ? (
      <a
        href={`/pdf-metadata-viewer/id/${target.id}`}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-2 text-sm text-text-secondary hover:bg-background-active"
        aria-label={`${label}: ${target.filename ?? "(unnamed)"}`}
      >
        <span aria-hidden className="lg:hidden">
          {label === "Previous" ? `${glyph} ${label}` : `${label} ${glyph}`}
        </span>
        <span aria-hidden className="hidden lg:inline">
          {glyph}
        </span>
      </a>
    ) : (
      <span className="min-w-11" aria-hidden />
    );

  return (
    <div className="flex flex-1 flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="bg-background-secondary px-4 py-4 lg:px-24">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
          <div className="flex items-center justify-between gap-4 lg:contents">
            <Button asChild variant="secondary" size="sm" className="lg:order-1">
              <a href="/pdf-metadata-viewer">← All documents</a>
            </Button>
            {pending.count > 0 ? (
              // Frame 34:289: a warning dot and label on the dark pill. MVDS
              // Badge has no warning variant, so this is drawn here.
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background-primary px-3 py-1 text-xs text-warning lg:order-5 lg:ml-auto">
                <span aria-hidden className="size-1.5 rounded-full bg-warning" />
                {pending.count} pending {pending.count === 1 ? "edit" : "edits"}
              </span>
            ) : null}
          </div>

          <h1 className="min-w-0 break-words text-lg text-text-primary lg:order-3 lg:flex-1">
            {filename}
          </h1>

          <div className="flex items-center justify-between lg:contents">
            <div className="lg:order-2">{stepLink(previous, "Previous", "‹")}</div>
            <div className="lg:order-6">{stepLink(next, "Next", "›")}</div>
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:flex-row lg:gap-12 lg:px-24 lg:py-0">
        <section className="flex flex-col gap-3 lg:flex-1 lg:py-0" aria-label="Preview">
          <Suspense
            fallback={
              <>
                <div aria-busy className={`${FRAME} bg-background-secondary`} />
                <div className="min-h-11" />
              </>
            }
          >
            <Preview
              document={document}
              access={access}
              file={file}
              filename={filename}
              contentUrl={contentUrl}
            />
          </Suspense>
        </section>

        <section
          className="flex flex-col rounded-lg bg-background-secondary lg:w-[428px] lg:shrink-0 lg:rounded-none"
          aria-label="Details"
        >
          <Suspense fallback={<DetailsWaiting document={document} />}>
            <Details document={document} file={file} />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
