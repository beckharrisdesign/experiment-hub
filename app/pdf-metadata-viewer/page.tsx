import { Badge, Button, Container, Inline, Stack } from "@beckharrisdesign/mvds";
import { listPdfDocuments, type PdfDocument } from "@/lib/pdf-documents";
import { getDriveConnection, type DriveConnection } from "@/lib/pdf-drive";
import { summarizePending } from "@/lib/pdf-staging";
import FolderPicker from "./FolderPicker";
import { DocumentsSection } from "./DocumentsSection";
import { AttentionCard } from "./AttentionCard";

/**
 * Hosted pdf-metadata-viewer dashboard.
 * openspec/changes/pdf-metadata-viewer-cloud — Figma `02.9`, frame `34:172`.
 *
 * Server component reading the working store directly: this runs in the same
 * process as the route handlers, so an HTTP round trip to its own API would buy
 * nothing. The API routes exist for client-side interaction, not for this.
 *
 * Gated by middleware.ts, which returns before this renders.
 */
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Stat — label over value. Proposed for MVDS as `<Stat label value tone />`
// (design.md, Figma variant set 19:17). Local until it lands there.
// ---------------------------------------------------------------------------

type Tone = "default" | "warning" | "danger";

const TONE_CLASS: Record<Tone, string> = {
  default: "text-text-primary",
  warning: "text-warning",
  danger: "text-error",
};

// Column headers are static — module scope, not rebuilt on every render.
const TABLE_HEADERS = ["Filename", "Title", "Keywords", "Pages", "State"];

interface StatProps {
  label: string;
  value: string;
  tone?: Tone;
}

function Stat({ label, value, tone = "default" }: StatProps) {
  return (
    <Stack gap={4}>
      <span className="text-xs font-medium text-text-muted">{label}</span>
      <span className={`text-3xl font-semibold ${TONE_CLASS[tone]}`}>{value}</span>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Documents table
// ---------------------------------------------------------------------------

function StateCell({ document }: { document: PdfDocument }) {
  if (document.hasPendingEdits) {
    // Frame 34:172: the count in a warning pill, as on the detail page header.
    const count = summarizePending(document).count;
    return (
      <span className="inline-flex items-center rounded-full bg-background-primary px-3 py-1 text-xs whitespace-nowrap text-warning">
        {count > 0 ? `${count} pending ${count === 1 ? "edit" : "edits"}` : "Pending edits"}
      </span>
    );
  }
  if (document.committedAt) {
    return <Badge variant="muted">Committed</Badge>;
  }
  return <Badge variant="muted">Not yet tagged</Badge>;
}

function DocumentsTable({ documents }: { documents: PdfDocument[] }) {
  return (
    <div className="overflow-x-auto rounded-lg bg-background-secondary">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            {TABLE_HEADERS.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-xs font-medium text-text-muted"
                scope="col"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {documents.map((d) => (
            <tr key={d.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 text-text-primary">
                <a
                  href={`/pdf-metadata-viewer/id/${d.id}`}
                  className="hover:underline"
                >
                  {d.filename ?? "(unnamed)"}
                </a>
              </td>
              <td className="px-4 py-3 text-text-muted">{d.title ?? "—"}</td>
              <td className="px-4 py-3 text-text-muted">
                {d.keywords.length > 0 ? d.keywords.join(", ") : "—"}
              </td>
              <td className="px-4 py-3 text-text-muted">{d.pageCount ?? "—"}</td>
              <td className="px-4 py-3">
                <StateCell document={d} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Needs attention — task 8.8, design.md D4, frame 34:172
// ---------------------------------------------------------------------------

/**
 * An instance stays while it still means something: a missing file always
 * does; a conflict or failed commit only while there are edits left to write.
 * Edits undone by hand resolve it as surely as a commit would.
 */
function isOpen(d: PdfDocument): boolean {
  if (!d.attention) return false;
  return d.attention.kind === "file_missing" || d.hasPendingEdits;
}

/** Retrying cannot help these, so bulk commit leaves them out and says so. */
function excludedFromBulk(d: PdfDocument): boolean {
  return isOpen(d) && d.attention?.kind !== "commit_failed";
}

function NeedsAttention({ documents }: { documents: PdfDocument[] }) {
  return (
    <Stack gap={16}>
      <h2 className="text-base font-semibold text-text-primary">Needs attention</h2>
      <ul className="flex flex-col gap-3">
        {documents.map((d) => (
          <li key={d.id}>
            <AttentionCard document={d} />
          </li>
        ))}
      </ul>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PdfMetadataViewerPage({
  searchParams,
}: {
  searchParams: Promise<{ pending?: string }>;
}) {
  // "Review pending" narrows the table to documents with edits to write.
  const reviewing = (await searchParams).pending === "1";
  let documents: PdfDocument[] = [];
  let loadError: string | null = null;
  let drive: DriveConnection = {
    connected: false,
    email: null,
    hasRefreshToken: false,
    folder: null,
  };

  try {
    drive = await getDriveConnection();
    // Only the chosen folder's documents (migration 026).
    documents = await listPdfDocuments(drive.folder?.id ?? null);
  } catch (error) {
    // Surfaced rather than rendered as an empty archive — with RLS on and no
    // policies, a configuration problem would otherwise look like "no documents".
    loadError = error instanceof Error ? error.message : "Unknown error";
  }

  const pending = documents.filter((d) => d.hasPendingEdits).length;
  const attention = documents.filter(isOpen);

  // MVDS `Section` is deliberately not used here. It applies `bg-background`
  // unconditionally — there is no transparent option, and all four SurfaceBg
  // values resolve to MVDS tokens. In the hub's dark mode that is near-black
  // (lab 2.75), not the hub's --color-background-primary green (rgb 25 75 49),
  // so it paints a visible black band across the top of an otherwise green page.
  // Token reconciliation with MVDS is issue #285. Until then `Container` gives
  // the same width cap and gutters without bringing a background with it.
  return (
    <div className="py-6">
      <Container size="xl">
        <Stack gap={32}>
          {/* The app name and Drive account are in the bar above (AppBar). */}
          <h1 className="sr-only">PDF Metadata Viewer</h1>

          {drive.connected && (drive.folder || documents.length > 0) ? (
            // Which folder the archive is showing, and the way to change it.
            // Not in frame 34:172, which predates the folder being stored.
            <Inline gap={16} align="center">
              <span className="text-sm text-text-muted">
                Folder:{" "}
                {drive.folder ? (
                  <a
                    href={`https://drive.google.com/drive/folders/${encodeURIComponent(drive.folder.id)}`}
                    target="_blank"
                    rel="noopener"
                    className="text-text-primary hover:underline"
                  >
                    {drive.folder.name ?? "(unnamed folder)"}
                  </a>
                ) : (
                  <span className="text-text-primary">not recorded yet</span>
                )}
              </span>
              <FolderPicker
                label={drive.folder ? "Change folder" : "Choose folder"}
                variant="outline"
              />
            </Inline>
          ) : null}

          {loadError ? (
            <div className="rounded-lg border-l-2 border-error bg-background-secondary p-4">
              <Stack gap={4}>
                <span className="font-semibold text-error">
                  Could not read the document store
                </span>
                <span className="text-sm text-text-muted">
                  This is a configuration problem, not an empty archive. {loadError}
                </span>
              </Stack>
            </div>
          ) : (
            <>
              <Inline gap={48}>
                <Stat label="Documents" value={String(documents.length)} />
                <Stat
                  label="Pending edits"
                  value={String(pending)}
                  tone={pending > 0 ? "warning" : "default"}
                />
                <Stat
                  label="Needs attention"
                  value={String(attention.length)}
                  tone={attention.length > 0 ? "danger" : "default"}
                />
              </Inline>

              {documents.length === 0 ? (
                <div className="rounded-lg bg-background-secondary p-8">
                  {drive.connected && drive.folder ? (
                    <Stack gap={8}>
                      <span className="font-semibold text-text-primary">
                        No PDFs in {drive.folder.name ?? "this folder"} yet
                      </span>
                      <span className="text-sm text-text-muted">
                        Add scans to the folder in Drive and choose it again to
                        bring them in, or change to another folder above.
                      </span>
                    </Stack>
                  ) : drive.connected ? (
                    <Stack gap={8}>
                      <span className="font-semibold text-text-primary">
                        Drive is connected — now choose a folder
                      </span>
                      <span className="text-sm text-text-muted">
                        This app can only see files you hand it. Pick the folder
                        your scans live in and its documents become available;
                        nothing else in your Drive is readable.
                      </span>
                      <FolderPicker />
                    </Stack>
                  ) : (
                    <Stack gap={8}>
                      <span className="font-semibold text-text-primary">
                        Connect Google Drive
                      </span>
                      <span className="text-sm text-text-muted">
                        One approval covers signing in and access to the folder
                        you choose. Documents stay in Drive — this only stores a
                        reference to them.
                      </span>
                      <div>
                        <a href="/api/pdf-drive/connect">
                          <Button>Connect Google Drive</Button>
                        </a>
                      </div>
                    </Stack>
                  )}
                </div>
              ) : (
                <>
                {attention.length > 0 ? <NeedsAttention documents={attention} /> : null}
                <DocumentsSection
                  excluded={documents.filter((d) => d.hasPendingEdits && excludedFromBulk(d)).length}
                  pending={documents
                    .filter((d) => d.hasPendingEdits && !excludedFromBulk(d))
                    .map((d) => ({ id: d.id, filename: d.filename ?? "(unnamed)" }))}
                  reviewing={reviewing}
                >
                  <DocumentsTable
                    documents={reviewing ? documents.filter((d) => d.hasPendingEdits) : documents}
                  />
                </DocumentsSection>
                </>
              )}
            </>
          )}
        </Stack>
      </Container>
    </div>
  );
}
