import { notFound } from "next/navigation";
import { Button } from "@beckharrisdesign/mvds";
import { getPdfDocument, isUuid, listSplitParts } from "@/lib/pdf-documents";
import { listViewQuery, parseListView, type RawParams } from "@/lib/pdf-list-view";
import { SplitView } from "./SplitView";

/**
 * Split — break one scan into several documents.
 * openspec/changes/pdf-metadata-viewer-cloud — tasks 7b.1–7b.3; Figma `02.11`
 * (frames 69:9, 69:132). Opening it reads nothing from Drive on the server:
 * the page thumbnails are drawn in the browser from the content route.
 */
export const dynamic = "force-dynamic";

export default async function SplitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<RawParams>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  // Carried through so the way back leads to the list as it was left (D13).
  const listQuery = listViewQuery(parseListView(await searchParams));
  const document = await getPdfDocument(id);
  if (!document) notFound();

  const detailUrl = `/pdf-metadata-viewer/id/${id}${listQuery}`;
  const filename = document.filename ?? "document";
  const parts = document.supersededAt ? await listSplitParts(id) : [];

  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-background-secondary px-4 py-4 lg:px-24">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
          <div>
            <Button asChild variant="secondary" size="sm">
              <a href={detailUrl}>← Back to document</a>
            </Button>
          </div>
          <h1 className="min-w-0 break-words text-lg text-text-primary">Split — {filename}</h1>
        </div>
      </header>

      {document.supersededAt ? (
        <main className="flex flex-1 flex-col gap-4 px-4 pt-6 lg:px-24">
          <div className="rounded-lg border-l-2 border-warning bg-background-secondary p-4">
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-text-primary">This document was already split</span>
              <span className="text-sm text-text-muted">
                Its parts are the documents now. The original file is still in Drive.
              </span>
              <ul className="flex flex-col gap-1 text-sm">
                {parts.map((p) => (
                  <li key={p.id}>
                    <a href={`/pdf-metadata-viewer/id/${p.id}${listQuery}`} className="text-text-primary underline">
                      {p.filename}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </main>
      ) : (
        <SplitView
          documentId={id}
          listQuery={listQuery}
          filename={document.filename}
          contentUrl={`/api/pdf-documents/id/${id}/content`}
        />
      )}
    </div>
  );
}
