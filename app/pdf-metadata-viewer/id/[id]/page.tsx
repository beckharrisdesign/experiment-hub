import { notFound } from "next/navigation";
import { Button } from "@beckharrisdesign/mvds";
import {
  getPdfDocument,
  isUuid,
  listPdfDocuments,
} from "@/lib/pdf-documents";
import { getDriveConnection } from "@/lib/pdf-drive";
import { checkFile, storedFileValues, type Problem } from "@/lib/pdf-file-read";
import { toListRow } from "@/lib/pdf-list-rows";
import { applyListView, listViewQuery, parseListView, type ListRow, type RawParams } from "@/lib/pdf-list-view";
import { shownValues } from "@/lib/pdf-shown-values";
import { summarizePending } from "@/lib/pdf-staging";
import { DetailsEditor } from "./DetailsEditor";
import { DetailsFromFile } from "./FromFile";
import { PagePreview } from "./PagePreview";

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
 * Loading: the page renders from the database and one small Drive read (is
 * the file still there, and at which revision?). What the file itself says is
 * needed only when the stored copy may be stale; then the browser asks for it
 * after the page is up (`FromFile.tsx`), because reading it means downloading
 * the whole file. No download is needed when the values are already stored
 * for the revision Drive holds now: an edited document's baseline, or the read
 * saved on an earlier visit (migration 031).
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
const FRAME = "h-[420px] w-full lg:h-[calc(100vh-185px)]";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PdfDocumentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<RawParams>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const [{ folder }, document] = await Promise.all([getDriveConnection(), getPdfDocument(id)]);
  if (!document) notFound();

  const [access, all] = await Promise.all([
    checkFile(document),
    listPdfDocuments(folder?.id ?? null),
  ]);
  // The file's own values, when stored for the revision Drive holds now: the
  // baseline of an edited document, or a read saved on an earlier visit.
  const fresh = access.ok ? storedFileValues(document, access.head) : null;
  const revision = access.ok ? access.head : null;
  const baselined = document.fileBaseline !== null;
  const stored = {
    title: document.title,
    subject: document.subject,
    author: document.author,
    keywords: document.keywords,
  };
  const locked = document.supersededAt ? LOCKED_SPLIT : undefined;

  // Previous/next follow the list as the user left it — searched, filtered and
  // sorted the same way, from the same query string (design.md D13). This
  // document keeps its place even if an edit here took it out of that list.
  const view = parseListView(await searchParams);
  const listQuery = listViewQuery(view);
  const list = applyListView(all.map(toListRow), view, document.id);
  const index = list.findIndex((d) => d.id === document.id);
  const previous = index > 0 ? list[index - 1] : null;
  const next = index >= 0 && index < list.length - 1 ? list[index + 1] : null;

  const pending = summarizePending(document);
  const edited = {
    fields: pending.fields,
    keywordsAdded: pending.keywordsAdded,
    keywordsRemoved: pending.keywordsRemoved,
  };
  const contentUrl = `/api/pdf-documents/id/${document.id}/content`;
  const filename = document.filename ?? "(unnamed)";

  const stepLink = (target: ListRow | null, label: string, glyph: string) =>
    target ? (
      <a
        href={`/pdf-metadata-viewer/id/${target.id}${listQuery}`}
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
              <a href={`/pdf-metadata-viewer${listQuery}`}>← All documents</a>
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
          {access.ok ? (
            <PagePreview
              // A commit uploads a new revision at the same URL; remount so
              // the preview draws the file as it now is.
              key={document.driveRevisionId ?? "initial"}
              documentId={document.id}
              listQuery={listQuery}
              contentUrl={contentUrl}
              filename={filename}
              storedPageCount={document.pageCount ?? fresh?.pageCount ?? null}
              wasSplit={document.supersededAt !== null}
              frameClass={FRAME}
            />
          ) : (
            <div className="rounded-lg border-l-2 border-warning bg-background-secondary p-4">
              <div className="flex flex-col gap-2">
                <span className="font-semibold text-warning">
                  {FILE_PROBLEM[access.reason].heading}
                </span>
                <span className="text-sm text-text-muted">{FILE_PROBLEM[access.reason].body}</span>
                {access.reason === "reauthorize" ? (
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

        <section
          className="flex flex-col rounded-lg bg-background-secondary lg:w-[428px] lg:shrink-0 lg:rounded-none"
          aria-label="Details"
        >
          {access.ok && !fresh ? (
            <DetailsFromFile
              documentId={document.id}
              listQuery={listQuery}
              revision={revision}
              stored={stored}
              baselined={baselined}
              edited={edited}
              pendingCount={pending.count}
              locked={locked}
            />
          ) : (
            <DetailsEditor
              documentId={document.id}
              listQuery={listQuery}
              values={shownValues(stored, baselined, fresh ?? undefined)}
              inFile={fresh ?? undefined}
              edited={edited}
              // The file couldn't be reached: editable only once a baseline
              // exists, since the first edit records what the file says.
              disabled={!access.ok && !baselined}
              pendingCount={pending.count}
              locked={locked}
            />
          )}
        </section>
      </div>
    </div>
  );
}
