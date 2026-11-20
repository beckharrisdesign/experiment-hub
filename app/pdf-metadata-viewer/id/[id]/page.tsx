import { notFound } from "next/navigation";
import { Badge, Button } from "@beckharrisdesign/mvds";
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
  getValidAccessToken,
} from "@/lib/pdf-drive";
import { readEmbeddedMetadata, type EmbeddedMetadata } from "@/lib/pdf-embedded";

/**
 * Hosted pdf-metadata-viewer — document detail, view only.
 * openspec/changes/pdf-metadata-viewer-cloud — Figma `02.9` frame `34:289`
 * (desktop) and `02.10` frame `40:3` (phone).
 *
 * The approved frames minus everything that writes: no Suggest metadata, no
 * editable inputs, no commit bar. Those land with the write path (group 8);
 * until then each field shows what the working store holds, falling back to
 * what the file itself says, and the "In the file" line appears only where the
 * two differ — the same rule the editable version will use.
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
    body: "It may have been moved or deleted. Its details and history here are kept.",
  },
  unreadable: {
    heading: "Could not read this file from Drive",
    body: "Try again in a moment. Its details here are unaffected.",
  },
};

// ---------------------------------------------------------------------------
// Fields
// ---------------------------------------------------------------------------

function ReadOnlyField({
  label,
  stored,
  inFile,
}: {
  label: string;
  stored: string | null;
  /** Undefined when the file could not be read — nothing to compare against. */
  inFile: string | null | undefined;
}) {
  const shown = stored ?? inFile ?? null;
  // Only a value staged here can differ from the file; with nothing staged the
  // field is showing the file's own value, and repeating it would be noise.
  const differs = stored !== null && inFile !== undefined && stored !== inFile;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-secondary">{label}</span>
      <div className="min-h-11 rounded-md bg-background-primary px-3 py-2.5 text-sm text-text-primary break-words">
        {shown ?? "—"}
      </div>
      {differs ? (
        <span className="text-xs text-text-muted">
          In the file: {inFile ?? "(empty)"}
        </span>
      ) : null}
    </div>
  );
}

function KeywordList({ keywords }: { keywords: string[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-secondary">Keywords</span>
      {keywords.length === 0 ? (
        <span className="text-sm text-text-muted">None</span>
      ) : (
        <ul className="flex flex-wrap gap-2" aria-label="Keywords">
          {keywords.map((k) => (
            <li
              key={k}
              className="rounded-full bg-background-primary px-3 py-1 text-xs text-text-primary"
            >
              {k}
            </li>
          ))}
        </ul>
      )}
    </div>
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

  const [document, all] = await Promise.all([
    getPdfDocument(id),
    listPdfDocuments(),
  ]);
  if (!document) notFound();

  const file = await readFile(document);
  const embedded = file.ok ? file.embedded : undefined;

  // Previous/next follow the dashboard's own order, so stepping through here
  // walks the same list the user just left.
  const index = all.findIndex((d) => d.id === document.id);
  const previous = index > 0 ? all[index - 1] : null;
  const next = index >= 0 && index < all.length - 1 ? all[index + 1] : null;

  const keywords =
    document.keywords.length > 0 ? document.keywords : (embedded?.keywords ?? []);
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
    <div className="flex min-h-screen flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="bg-background-secondary px-4 py-4 lg:px-24">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
          <div className="flex items-center justify-between gap-4 lg:contents">
            <Button asChild variant="secondary" size="sm" className="lg:order-1">
              <a href="/pdf-metadata-viewer">← All documents</a>
            </Button>
            {document.hasPendingEdits ? (
              <Badge variant="default" className="lg:order-5 lg:ml-auto">
                Pending edits
              </Badge>
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
                src={contentUrl}
                title={`Preview of ${filename}`}
                className="h-[420px] w-full rounded-md bg-white lg:h-[calc(100vh-7rem)]"
              />
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>
                  {pageCount === null
                    ? ""
                    : `${pageCount} ${pageCount === 1 ? "page" : "pages"}`}
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
          <div className="flex flex-col gap-5 p-5">
            <ReadOnlyField
              label="Title"
              stored={document.title}
              inFile={embedded ? embedded.title : undefined}
            />
            <ReadOnlyField
              label="Subject"
              stored={document.subject}
              inFile={embedded ? embedded.subject : undefined}
            />
            <ReadOnlyField
              label="Author"
              stored={document.author}
              inFile={embedded ? embedded.author : undefined}
            />
            <KeywordList keywords={keywords} />
          </div>
          <p className="mt-auto border-t border-border p-5 text-xs text-text-muted">
            View only for now. Editing, and saving changes back to Drive, come
            next.
          </p>
        </section>
      </div>
    </div>
  );
}
