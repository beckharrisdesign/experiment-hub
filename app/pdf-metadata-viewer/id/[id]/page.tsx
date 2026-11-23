import { notFound } from "next/navigation";
import { Button } from "@beckharrisdesign/mvds";
import {
  getPdfDocument,
  isUuid,
  listPdfDocuments,
  type PdfDocument,
} from "@/lib/pdf-documents";
import {
  DriveFileMissing,
  DriveReauthorizationRequired,
  downloadDriveFile,
  getDriveConnection,
  getDriveHeadRevisionId,
  getValidAccessToken,
} from "@/lib/pdf-drive";
import { readEmbeddedMetadata, type EmbeddedMetadata } from "@/lib/pdf-embedded";
import { summarizePending } from "@/lib/pdf-staging";
import { DetailsEditor } from "./DetailsEditor";

/**
 * Hosted pdf-metadata-viewer — document detail.
 * openspec/changes/pdf-metadata-viewer-cloud — Figma `02.9` frame `34:289`
 * (desktop) and `02.10` frame `40:3` (phone).
 *
 * Fields are editable and save as staged edits (task 8.1): saved here, not yet
 * in the file. The commit bar writes them into the PDF in Drive (task 8.2). Not
 * yet built from the approved frames: Suggest metadata (needs the vision route).
 *
 * Until a document's first edit, its stored fields are unread nulls and the
 * page shows what the file itself says. From the first edit on, the stored
 * fields are authoritative (design.md D8, "captured on first edit").
 *
 * Gated by middleware.ts, which returns before this renders.
 */
export const dynamic = "force-dynamic";

type FileState =
  | { ok: true; embedded: EmbeddedMetadata }
  | { ok: false; reason: "reauthorize" | "missing" | "unreadable" };

/**
 * The file's own metadata, read from Drive's copy.
 *
 * A failure here never takes the page down: the working store's view of the
 * document still stands, and a broken reference should read as one (task 5.6).
 */
async function readFile(document: PdfDocument): Promise<FileState> {
  try {
    const accessToken = await getValidAccessToken();
    // A trashed file still downloads; only the revision read reports it gone.
    await getDriveHeadRevisionId(accessToken, document.driveFileId);
    const bytes = await downloadDriveFile(accessToken, document.driveFileId);
    return { ok: true, embedded: await readEmbeddedMetadata(bytes) };
  } catch (error) {
    if (error instanceof DriveReauthorizationRequired) {
      return { ok: false, reason: "reauthorize" };
    }
    if (error instanceof DriveFileMissing) {
      return { ok: false, reason: "missing" };
    }
    console.error("pdf detail: could not read file from Drive:", error);
    return { ok: false, reason: "unreadable" };
  }
}

const FILE_PROBLEM: Record<
  Extract<FileState, { ok: false }>["reason"],
  { heading: string; body: string }
> = {
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

  const { folder } = await getDriveConnection();
  const [document, all] = await Promise.all([
    getPdfDocument(id),
    listPdfDocuments(folder?.id ?? null),
  ]);
  if (!document) notFound();

  const file = await readFile(document);
  const embedded = file.ok ? file.embedded : undefined;

  // Previous/next follow the dashboard's own order, so stepping through here
  // walks the same list the user just left.
  const index = all.findIndex((d) => d.id === document.id);
  const previous = index > 0 ? all[index - 1] : null;
  const next = index >= 0 && index < all.length - 1 ? all[index + 1] : null;

  const baselined = document.fileBaseline !== null;
  const values = baselined
    ? document
    : {
        title: document.title ?? embedded?.title ?? null,
        subject: document.subject ?? embedded?.subject ?? null,
        author: document.author ?? embedded?.author ?? null,
        keywords:
          document.keywords.length > 0 ? document.keywords : (embedded?.keywords ?? []),
      };
  const pending = summarizePending(document);
  const pageCount = document.pageCount ?? embedded?.pageCount ?? null;
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
        {/* Preview */}
        <section className="flex flex-col gap-3 lg:flex-1 lg:py-0" aria-label="Preview">
          {file.ok ? (
            <>
              <iframe
                // A commit uploads a new revision at the same URL; remount so
                // the preview shows the file as it now is.
                // On wide screens the page fits one screen: 185px is the app bar
                // (53), this view's header (76) and the page-count row with its
                // gap (56). Measured on the live page; adjust if any of those change.
                key={document.driveRevisionId ?? "initial"}
                src={contentUrl}
                title={`Preview of ${filename}`}
                className="h-[420px] w-full rounded-md bg-white lg:h-[calc(100vh-185px)]"
              />
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span className="flex items-center gap-4">
                  <span>
                    {pageCount === null
                      ? ""
                      : `${pageCount} ${pageCount === 1 ? "page" : "pages"}`}
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
            </>
          ) : (
            <div className="rounded-lg border-l-2 border-warning bg-background-secondary p-4">
              <div className="flex flex-col gap-2">
                <span className="font-semibold text-warning">
                  {FILE_PROBLEM[file.reason].heading}
                </span>
                <span className="text-sm text-text-muted">
                  {FILE_PROBLEM[file.reason].body}
                </span>
                {file.reason === "reauthorize" ? (
                  <div>
                    <Button asChild size="sm">
                      <a href="/api/pdf-drive/connect">Sign in again</a>
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </section>

        {/* Details panel */}
        <section
          className="flex flex-col rounded-lg bg-background-secondary lg:w-[428px] lg:shrink-0 lg:rounded-none"
          aria-label="Details"
        >
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
            disabled={!file.ok && !baselined}
            pendingCount={pending.count}
            locked={
              document.supersededAt
                ? "This scan was split into parts. Edit the parts instead."
                : undefined
            }
          />
        </section>
      </div>
    </div>
  );
}
