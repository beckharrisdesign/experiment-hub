"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@beckharrisdesign/mvds";

/**
 * The dashboard's Documents section with bulk commit — Figma `02.9` frame `34:172`.
 * openspec/changes/pdf-metadata-viewer-cloud — task 8.7; design.md D4.
 *
 * Bulk commit is N independent commits, not a transaction (D4): each document
 * goes through the same per-document route the detail page uses, one at a
 * time, so one failure stops nothing else and no single request has to outlast
 * a large batch. A failure leaves that document's edits staged and is listed
 * here with what to do about it. Keeping failures across visits is the Needs
 * attention list, task 8.8.
 *
 * The action pair appears above and below the table, as in the frame: a long
 * list does not fit on screen, and they bracket what they act on.
 */

export interface PendingDocument {
  id: string;
  filename: string;
}

type Outcome =
  | { kind: "written" }
  | { kind: "skipped" }
  | {
      kind: "failed";
      message: string;
      conflict?: boolean;
      reauthorize?: boolean;
    };

type Run =
  | { kind: "idle" }
  | { kind: "confirming" }
  | { kind: "running"; done: number; total: number; current: string }
  | { kind: "finished"; results: Array<PendingDocument & { outcome: Outcome }> };

interface Props {
  /** Pending documents bulk commit will attempt. */
  pending: PendingDocument[];
  /** Pending documents left out because a conflict or missing file needs you first. */
  excluded: number;
  /** The table is showing pending documents only. */
  reviewing: boolean;
  /** Where Review pending / Show all goes, keeping the list's other choices. */
  toggleHref?: string;
  children: ReactNode;
}

export function DocumentsSection({
  pending,
  excluded,
  reviewing,
  toggleHref = reviewing ? "/pdf-metadata-viewer" : "/pdf-metadata-viewer?pending=1",
  children,
}: Props) {
  const router = useRouter();
  const [run, setRun] = useState<Run>({ kind: "idle" });
  const count = pending.length;
  const running = run.kind === "running";
  const label = `Commit ${count} ${count === 1 ? "document" : "documents"} to Drive`;

  async function commitAll() {
    const queue = [...pending];
    const results: Array<PendingDocument & { outcome: Outcome }> = [];
    for (const [index, doc] of queue.entries()) {
      setRun({ kind: "running", done: index, total: queue.length, current: doc.filename });
      let outcome: Outcome;
      try {
        const res = await fetch(`/api/pdf-documents/id/${doc.id}/commit`, { method: "POST" });
        const body = (await res.json().catch(() => ({}))) as {
          status?: string;
          error?: string;
          conflict?: boolean;
          reauthorize?: boolean;
        };
        if (res.ok) {
          outcome = body.status === "nothing-pending" ? { kind: "skipped" } : { kind: "written" };
        } else {
          outcome = {
            kind: "failed",
            message: body.error ?? "Not written. Your edits are kept.",
            conflict: body.conflict,
            reauthorize: body.reauthorize,
          };
        }
      } catch {
        outcome = { kind: "failed", message: "Could not reach the server. Your edits are kept." };
      }
      results.push({ ...doc, outcome });
    }
    setRun({ kind: "finished", results });
    router.refresh();
  }

  const actions = (
    <div className="flex flex-wrap items-center gap-3">
      <Button asChild variant="outline" className="min-h-11">
        <a href={toggleHref}>
          {reviewing ? "Show all documents" : "Review pending"}
        </a>
      </Button>
      <Button
        className="min-h-11"
        disabled={count === 0 || running || run.kind === "confirming"}
        onClick={() => setRun({ kind: "confirming" })}
      >
        {run.kind === "running" ? `Writing ${run.done + 1} of ${run.total}…` : label}
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-text-primary">
          {reviewing ? "Pending documents" : "Documents"}
        </h2>
        {actions}
      </div>

      {run.kind === "confirming" ? (
        <div className="flex flex-col gap-3 rounded-lg border-l-2 border-warning bg-background-secondary p-4">
          <span className="text-sm text-text-primary">
            Write the pending edits into {count} {count === 1 ? "file" : "files"} in Drive? Each
            file is replaced with a new version; Drive keeps the old one in its version history.
          </span>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="min-h-11" onClick={() => setRun({ kind: "idle" })}>
              Cancel
            </Button>
            <Button className="min-h-11" onClick={() => void commitAll()}>
              {label}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Out of the flow while empty, so it leaves no gap. */}
      <p aria-live="polite" className="text-sm text-text-muted empty:absolute">
        {run.kind === "running" ? `Writing ${run.done + 1} of ${run.total}: ${run.current}` : ""}
      </p>

      {run.kind === "finished" ? <Results results={run.results} /> : null}

      {children}

      {count > 0 || excluded > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* D4: the count on the button always matches what will be attempted. */}
          <span className="text-xs text-text-muted">
            {excluded > 0 ? `${excluded} excluded — see Needs attention` : ""}
          </span>
          {actions}
        </div>
      ) : null}
    </div>
  );
}

function Results({ results }: { results: Array<PendingDocument & { outcome: Outcome }> }) {
  const written = results.filter((r) => r.outcome.kind === "written").length;
  const failed = results.filter(
    (r): r is PendingDocument & { outcome: Extract<Outcome, { kind: "failed" }> } =>
      r.outcome.kind === "failed",
  );

  return (
    <div
      role="status"
      className={`flex flex-col gap-3 rounded-lg border-l-2 bg-background-secondary p-4 ${
        failed.length > 0 ? "border-warning" : "border-success"
      }`}
    >
      <span className="font-semibold text-text-primary">
        {written} written to Drive
        {failed.length > 0 ? ` · ${failed.length} not written` : ""}
      </span>
      {failed.length > 0 ? (
        <>
          <span className="text-sm text-text-muted">
            Nothing was lost: these documents keep their edits and are still pending.
          </span>
          <ul className="flex flex-col gap-2">
            {failed.map((r) => (
              <li key={r.id} className="flex flex-col gap-0.5 text-sm">
                <a href={`/pdf-metadata-viewer/id/${r.id}`} className="text-text-primary hover:underline">
                  {r.filename}
                </a>
                <span className="text-warning">
                  {r.outcome.message}{" "}
                  {r.outcome.conflict ? (
                    <a href={`/pdf-metadata-viewer/id/${r.id}/compare`} className="underline">
                      Compare
                    </a>
                  ) : null}
                  {r.outcome.reauthorize ? (
                    <a href="/api/pdf-drive/connect" className="underline">
                      Sign in again
                    </a>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
