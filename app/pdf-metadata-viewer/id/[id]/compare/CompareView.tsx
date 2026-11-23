"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@beckharrisdesign/mvds";
import type { Choice, Choices, ConflictField, FieldComparison } from "@/lib/pdf-conflict";

/**
 * The interactive half of Compare — Figma `02.9` frame `34:9`.
 * openspec/changes/pdf-metadata-viewer-cloud — task 8.4; design.md D8.
 *
 * Only fields both sides changed differently ask for a choice; the rest show
 * which value applies and why. Nothing is written until an outcome is picked,
 * and leaving keeps the staged edits.
 */

const LABELS: Record<ConflictField, string> = {
  title: "Title",
  subject: "Subject",
  author: "Author",
  keywords: "Keywords",
};

const STATE_LABEL: Record<FieldComparison["state"], string> = {
  unchanged: "Unchanged",
  yours: "Applies",
  drive: "Applies",
  agreed: "Same on both",
  conflict: "Needs decision",
};

function show(value: FieldComparison["was"]): string {
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "(empty)";
  return value ?? "(empty)";
}

interface Props {
  documentId: string;
  fields: FieldComparison[];
  pages: { was: number; now: number } | null;
  seenRevision: string | null;
  contentUrl: string;
}

type Status =
  | { kind: "idle" }
  | { kind: "working"; action: "commit" | "discard" }
  | { kind: "error"; message: string; stale?: boolean; reauthorize?: boolean };

export function CompareView({ documentId, fields, pages, seenRevision, contentUrl }: Props) {
  const router = useRouter();
  const [choices, setChoices] = useState<Choices>({});
  const [sameDocument, setSameDocument] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const conflicts = fields.filter((f) => f.state === "conflict");
  const undecided = conflicts.filter((f) => !choices[f.field]).length;
  const resolving = fields.filter((f) => f.state !== "unchanged");
  const needsDocumentDecision = pages !== null && !sameDocument;
  const busy = status.kind === "working";
  const canCommit = !busy && undecided === 0 && !needsDocumentDecision;

  async function resolve(action: "commit" | "discard") {
    setStatus({ kind: "working", action });
    try {
      const res = await fetch(`/api/pdf-documents/id/${documentId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, choices, seenRevision, sameDocument }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        stale?: boolean;
        reauthorize?: boolean;
      };
      if (!res.ok) {
        setStatus({
          kind: "error",
          message: body.error ?? "Could not resolve the conflict. Your edits are kept.",
          stale: body.stale,
          reauthorize: body.reauthorize,
        });
        return;
      }
      router.push(`/pdf-metadata-viewer/id/${documentId}`);
      router.refresh();
    } catch {
      setStatus({ kind: "error", message: "Could not reach the server. Your edits are kept." });
    }
  }

  const choose = (field: ConflictField, choice: Choice) =>
    setChoices((c) => ({ ...c, [field]: choice }));

  const actions = (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="outline"
        className="min-h-11"
        disabled={busy}
        onClick={() => void resolve("discard")}
      >
        {status.kind === "working" && status.action === "discard" ? "Discarding…" : "Discard my edits"}
      </Button>
      <Button className="min-h-11" disabled={!canCommit} onClick={() => void resolve("commit")}>
        {status.kind === "working" && status.action === "commit"
          ? "Writing to Drive…"
          : "Commit with these choices"}
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      {pages ? (
        <div className="rounded-lg border-l-2 border-warning bg-background-secondary p-4">
          <div className="flex flex-col gap-3">
            <span className="font-semibold text-warning">
              The document itself changed — {pages.was} {pages.was === 1 ? "page" : "pages"} became{" "}
              {pages.now}
            </span>
            <span className="text-sm text-text-muted">
              Decide this before the fields below. Your edits describe the {pages.was}-page
              version, so if this is no longer the same document those choices don&apos;t mean
              anything yet.
            </span>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="min-h-11">
                <a href={contentUrl} target="_blank" rel="noopener">
                  Open the new version
                </a>
              </Button>
              <Button
                variant="secondary"
                className="min-h-11"
                aria-pressed={sameDocument}
                disabled={busy}
                onClick={() => setSameDocument(true)}
              >
                {sameDocument ? "✓ " : ""}Still the same document — keep my edits
              </Button>
              <Button
                variant="secondary"
                className="min-h-11"
                disabled={busy}
                onClick={() => void resolve("discard")}
              >
                Different document — discard and re-tag
              </Button>
            </div>
            <span className="text-xs text-text-muted">
              Looking doesn&apos;t change anything. Nothing is re-baselined unless you choose one
              of the two outcomes.
            </span>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-12">
        <Stat label="Need your decision" value={conflicts.length} tone={conflicts.length > 0 ? "warning" : "default"} />
        <Stat label="Apply with no conflict" value={resolving.length - conflicts.length} />
        {pages ? <Stat label="Document changes" value={1} /> : null}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-text-primary">Changes</h2>
          {actions}
        </div>

        <div className="overflow-x-auto rounded-lg bg-background-secondary">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Field", "Was", "Yours", "In Drive", "State"].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 text-xs font-medium text-text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fields.map((f) => (
                <tr key={f.field} className="border-b border-border last:border-0">
                  <th scope="row" className="px-4 py-3 font-normal text-text-primary">
                    {LABELS[f.field]}
                  </th>
                  <td className="px-4 py-3 text-text-muted">{show(f.was)}</td>
                  <ValueCell f={f} side="yours" chosen={choices[f.field]} onChoose={choose} disabled={busy} />
                  <ValueCell f={f} side="drive" chosen={choices[f.field]} onChoose={choose} disabled={busy} />
                  <td className={`px-4 py-3 ${f.state === "conflict" ? "text-warning" : "text-text-secondary"}`}>
                    {f.state === "conflict" && choices[f.field] ? "Decided" : STATE_LABEL[f.state]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {status.kind === "error" ? (
        <p role="alert" className="text-sm text-warning">
          {status.message}{" "}
          {status.stale ? (
            <button type="button" className="underline" onClick={() => window.location.reload()}>
              Reload
            </button>
          ) : null}
          {status.reauthorize ? (
            <a href="/api/pdf-drive/connect" className="underline">
              Sign in again
            </a>
          ) : null}
        </p>
      ) : null}

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-4 border-t border-border bg-background-secondary px-4 py-4 lg:-mx-24 lg:px-24">
        {needsDocumentDecision || undecided > 0 ? (
          <span className="mr-auto text-xs text-text-muted">
            {needsDocumentDecision
              ? "Decide about the document above first."
              : `Choose a value for ${undecided} ${undecided === 1 ? "field" : "fields"}.`}
          </span>
        ) : null}
        {actions}
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "warning" }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      <span className={`text-3xl font-semibold ${tone === "warning" ? "text-warning" : "text-text-secondary"}`}>
        {value}
      </span>
    </div>
  );
}

function ValueCell({
  f,
  side,
  chosen,
  onChoose,
  disabled,
}: {
  f: FieldComparison;
  side: Choice;
  chosen: Choice | undefined;
  onChoose: (field: ConflictField, choice: Choice) => void;
  disabled: boolean;
}) {
  const value = side === "yours" ? f.yours : f.inDrive;
  const sideChanged = side === "yours" ? f.state === "yours" || f.state === "agreed" : f.state === "drive" || f.state === "agreed";

  if (f.state === "conflict") {
    const selected = chosen === side;
    return (
      <td className="p-0">
        <button
          type="button"
          disabled={disabled}
          aria-pressed={selected}
          aria-label={`Use ${side === "yours" ? "your" : "Drive's"} ${LABELS[f.field]}: ${show(value)}`}
          onClick={() => onChoose(f.field, side)}
          className={`flex min-h-11 w-full items-center gap-2 px-4 py-3 text-left ${
            selected
              ? "bg-accent-primary text-text-dark"
              : "text-text-primary hover:bg-background-active"
          }`}
        >
          {show(value)}
          {selected ? <span aria-hidden>✓</span> : null}
        </button>
      </td>
    );
  }

  if (f.state === "unchanged" || !sideChanged) {
    return <td className="px-4 py-3 text-text-muted">unchanged</td>;
  }
  return (
    <td className="px-4 py-3 text-text-primary">
      {show(value)}
      <span aria-hidden className="ml-2">✓</span>
    </td>
  );
}
