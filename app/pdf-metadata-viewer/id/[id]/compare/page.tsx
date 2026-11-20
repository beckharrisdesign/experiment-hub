import { notFound } from "next/navigation";
import { Button } from "@beckharrisdesign/mvds";
import { isUuid } from "@/lib/pdf-documents";
import { DriveFileMissing, DriveReauthorizationRequired } from "@/lib/pdf-drive";
import { loadComparison, type Comparison } from "@/lib/pdf-resolve";
import { summarizePending } from "@/lib/pdf-staging";
import { CompareView } from "./CompareView";

/**
 * Compare — a document whose file changed in Drive while edits were staged.
 * openspec/changes/pdf-metadata-viewer-cloud — task 8.4; Figma `02.9` frame `34:9`.
 *
 * Opening this page reads Drive and changes nothing (spec: "Inspecting the
 * changed document"). The frame's back link goes to Needs attention, which is
 * task 8.8; until it exists this one goes back to the document.
 */
export const dynamic = "force-dynamic";

function ago(iso: string | null): string {
  if (!iso) return "recently";
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

function Notice({ heading, body, children }: { heading: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border-l-2 border-warning bg-background-secondary p-4">
      <div className="flex flex-col gap-2">
        <span className="font-semibold text-text-primary">{heading}</span>
        <span className="text-sm text-text-muted">{body}</span>
        {children}
      </div>
    </div>
  );
}

export default async function ComparePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  let comparison: Comparison | null = null;
  let problem: { heading: string; body: string; reauthorize?: boolean } | null = null;
  try {
    comparison = await loadComparison(id);
  } catch (error) {
    if (error instanceof DriveReauthorizationRequired) {
      problem = { heading: "Drive access needs re-authorizing", body: "Sign in again to compare. Your edits are kept.", reauthorize: true };
    } else if (error instanceof DriveFileMissing) {
      problem = { heading: "This file is no longer in Google Drive", body: "There is nothing to compare against. Your edits and history are kept." };
    } else {
      console.error("pdf compare: could not read the file from Drive:", error);
      problem = { heading: "Could not read this file from Drive", body: "Try again in a moment. Your edits are kept." };
    }
  }
  if (!problem && !comparison) notFound();

  const detailUrl = `/pdf-metadata-viewer/id/${id}`;
  const filename = comparison?.document.filename ?? "document";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-background-secondary px-4 py-4 lg:px-24">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
          <div>
            <Button asChild variant="secondary" size="sm">
              <a href={detailUrl}>← Back to document</a>
            </Button>
          </div>
          <h1 className="min-w-0 break-words text-lg text-text-primary">Compare — {filename}</h1>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-8 px-4 pt-6 lg:px-24">
        {problem ? (
          <Notice heading={problem.heading} body={problem.body}>
            {problem.reauthorize ? (
              <div>
                <Button asChild size="sm">
                  <a href="/api/pdf-drive/connect">Sign in again</a>
                </Button>
              </div>
            ) : null}
          </Notice>
        ) : comparison?.kind === "nothing-pending" ? (
          <Notice heading="Nothing to compare" body="This document has no edits waiting to be written, so a change in Drive conflicts with nothing." />
        ) : comparison?.kind === "no-conflict" ? (
          <Notice heading="No conflict" body="The file hasn't changed in Drive since you started editing. Commit from the document page." />
        ) : comparison?.kind === "conflict" ? (
          <>
            <Notice
              heading={`This file changed in Drive ${ago(comparison.drive.modifiedTime)}, after you started editing.`}
              body={`Your ${summarizePending(comparison.document).count} staged edits are kept and nothing has been written. Drive doesn't report who made the change.`}
            />
            <CompareView
              documentId={id}
              fields={comparison.fields}
              pages={comparison.pages}
              seenRevision={comparison.drive.revision}
              contentUrl={`/api/pdf-documents/id/${id}/content`}
            />
          </>
        ) : null}
      </main>
    </div>
  );
}
