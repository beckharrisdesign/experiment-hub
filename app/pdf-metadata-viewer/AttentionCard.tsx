import { Button } from "@beckharrisdesign/mvds";
import type { PdfDocument } from "@/lib/pdf-documents";
import { RetryCommit } from "./RetryCommit";

/**
 * One instance in Needs attention — task 8.8, design.md D4, frame 34:172.
 *
 * The card leads to where the problem is resolved, not to the document: a
 * conflict card is a single link to Compare, so there is one place to go and
 * no second link competing with it. The filename names the document; it is not
 * a link anywhere.
 */

const ATTENTION_LABEL = {
  conflict: { label: "Conflict", text: "text-warning", dot: "bg-warning" },
  commit_failed: { label: "Commit failed", text: "text-error", dot: "bg-error" },
  file_missing: { label: "File missing", text: "text-success", dot: "bg-success" },
} as const;

export function ago(iso: string): string {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (!Number.isFinite(minutes) || minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

const CARD =
  "flex flex-col gap-3 rounded-lg bg-background-secondary p-4 sm:flex-row sm:items-start sm:justify-between";

export function AttentionCard({ document: d }: { document: PdfDocument }) {
  const a = d.attention!;
  const style = ATTENTION_LABEL[a.kind];

  const body = (
    <div className="flex min-w-0 gap-3">
      <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${style.dot}`} />
      <div className="flex min-w-0 flex-col gap-1">
        <span className="break-words text-sm">
          <span className={`font-semibold ${style.text}`}>{style.label}</span>{" "}
          <span className="text-text-primary">{d.filename ?? "(unnamed)"}</span>
        </span>
        <span className="text-sm text-text-muted">{a.message}</span>
      </div>
    </div>
  );
  const when = <span className="pt-3 text-xs whitespace-nowrap text-text-muted">{ago(a.at)}</span>;

  if (a.kind === "conflict") {
    // The whole card is the link. "Compare" is drawn as a button so it reads as
    // the action, but it is part of the link, not a second control.
    return (
      <a
        href={`/pdf-metadata-viewer/id/${d.id}/compare`}
        className={`${CARD} transition-colors hover:bg-background-active focus-visible:outline-2 focus-visible:outline-accent-primary`}
      >
        {body}
        <div className="flex shrink-0 items-start gap-4 sm:pl-4">
          {when}
          <Button asChild variant="secondary" size="sm" className="pointer-events-none min-h-11">
            <span>Compare</span>
          </Button>
        </div>
      </a>
    );
  }

  return (
    <div className={CARD}>
      {body}
      <div className="flex shrink-0 items-start gap-4 sm:pl-4">
        {when}
        {a.kind === "commit_failed" ? (
          <RetryCommit documentId={d.id} />
        ) : (
          <Button asChild variant="secondary" size="sm" className="min-h-11">
            <a
              href={`https://drive.google.com/drive/search?q=${encodeURIComponent(d.filename ?? "")}`}
              target="_blank"
              rel="noopener"
            >
              Locate
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
