import { Badge, Button, Container, Inline, Stack } from "@beckharrisdesign/mvds";
import { listPdfDocuments, type PdfDocument } from "@/lib/pdf-documents";
import { getDriveConnection } from "@/lib/pdf-drive";
import FolderPicker from "./FolderPicker";

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

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: Tone;
}) {
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
    return <Badge variant="default">Pending edits</Badge>;
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
            {["Filename", "Title", "Keywords", "Pages", "State"].map((h) => (
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
// Page
// ---------------------------------------------------------------------------

export default async function PdfMetadataViewerPage() {
  let documents: PdfDocument[] = [];
  let loadError: string | null = null;
  let drive = { connected: false, email: null as string | null, hasRefreshToken: false };

  try {
    [documents, drive] = await Promise.all([
      listPdfDocuments(),
      getDriveConnection(),
    ]);
  } catch (error) {
    // Surfaced rather than rendered as an empty archive — with RLS on and no
    // policies, a configuration problem would otherwise look like "no documents".
    loadError = error instanceof Error ? error.message : "Unknown error";
  }

  const pending = documents.filter((d) => d.hasPendingEdits).length;

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
          <Inline gap={16} align="center" justify="between">
            <h1 className="font-heading text-2xl">PDF Metadata Viewer</h1>
            {drive.connected ? (
              <Badge variant="success">
                Drive connected{drive.email ? ` · ${drive.email}` : ""}
              </Badge>
            ) : (
              <Badge variant="muted">Drive not connected</Badge>
            )}
          </Inline>

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
                <Stat label="Needs attention" value="0" />
              </Inline>

              {documents.length === 0 ? (
                <div className="rounded-lg bg-background-secondary p-8">
                  {drive.connected ? (
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
                <Stack gap={16}>
                  <Inline gap={16} align="center" justify="between">
                    <h2 className="text-base font-semibold text-text-primary">
                      Documents
                    </h2>
                    <Inline gap={16} align="center">
                      <span className="text-xs text-text-muted">
                        {documents.length} documents · {pending} pending
                      </span>
                      <Button variant="outline" disabled>
                        Review pending
                      </Button>
                      <Button disabled>Commit {pending} to Drive</Button>
                    </Inline>
                  </Inline>
                  <DocumentsTable documents={documents} />
                </Stack>
              )}
            </>
          )}
        </Stack>
      </Container>
    </div>
  );
}
