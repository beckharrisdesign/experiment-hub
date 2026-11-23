"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@beckharrisdesign/mvds";

/**
 * Editable details panel — Figma `02.9` frame `34:289`, `02.10` frame `40:3`.
 * openspec/changes/pdf-metadata-viewer-cloud — tasks 8.1, 8.2, 9.4.
 *
 * Every change saves as it is made (a text field on blur or Enter, a keyword on
 * add or remove) and lands as a staged edit: saved here, not yet in the file.
 * The commit bar writes them into the PDF in Drive, or discards them.
 *
 * Suggest metadata asks the vision route for a title, subject and keywords and
 * puts them straight into the fields as one staged edit (Katy's call,
 * 2026-11-23, as frame 34:289 shows): reviewing them is the ordinary pending
 * state, and Discard undoes them. Keywords are added to the ones already there.
 */

type TextField = "title" | "subject" | "author";

interface Values {
  title: string | null;
  subject: string | null;
  author: string | null;
  keywords: string[];
}

export interface DetailsEditorProps {
  documentId: string;
  values: Values;
  /** What the file says now; undefined when it could not be read. */
  inFile: Values | undefined;
  edited: {
    fields: TextField[];
    keywordsAdded: string[];
    keywordsRemoved: string[];
  };
  /** Nothing staged yet and the file unreadable: the first edit would fail. */
  disabled: boolean;
  /** Fields and keywords that differ from the file, as the header counts them. */
  pendingCount: number;
}

const LABELS: Record<TextField, string> = {
  title: "Title",
  subject: "Subject",
  author: "Author",
};

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "committing" }
  | { kind: "committed" }
  | { kind: "discarding" }
  | { kind: "discarded" }
  | { kind: "suggesting" }
  | { kind: "suggested"; changed: boolean }
  | { kind: "error"; message: string; reauthorize?: boolean; conflict?: boolean };

const BUSY = new Set<Status["kind"]>(["saving", "committing", "discarding", "suggesting"]);

interface Suggestions {
  title: string;
  subject: string;
  keywords: string[];
}

/** The edit a set of suggestions makes to the current values; empty when none. */
export function suggestionEdits(current: Values, s: Suggestions): Partial<Values> {
  const edits: Partial<Values> = {};
  const title = s.title.trim();
  if (title && title !== (current.title ?? "")) edits.title = title;
  const subject = s.subject.trim();
  if (subject && subject !== (current.subject ?? "")) edits.subject = subject;
  const added = s.keywords.filter((k) => !current.keywords.includes(k));
  if (added.length > 0) edits.keywords = [...current.keywords, ...added];
  return edits;
}

export function DetailsEditor({
  documentId,
  values,
  inFile,
  edited,
  disabled,
  pendingCount,
}: DetailsEditorProps) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  // Requests run one at a time, in the order made: two quick edits must not
  // land out of order, the first edit's baseline read must finish before the
  // next, and a commit clicked straight after typing must include that edit.
  const queue = useRef<Promise<boolean>>(Promise.resolve(true));
  // The latest saved values, for a suggestion that lands after other edits.
  const latest = useRef(values);
  useEffect(() => {
    latest.current = values;
  }, [values]);

  function enqueue(
    path: string,
    init: RequestInit,
    busy: Status,
    done: Status,
    fallback: string,
  ): Promise<boolean> {
    const run = async (): Promise<boolean> => {
      setStatus(busy);
      try {
        const res = await fetch(`/api/pdf-documents/id/${documentId}${path}`, init);
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
            reauthorize?: boolean;
            conflict?: boolean;
          };
          setStatus({
            kind: "error",
            message: body.error ?? fallback,
            reauthorize: body.reauthorize,
            conflict: body.conflict,
          });
          return false;
        }
        setStatus(done);
        router.refresh();
        return true;
      } catch {
        setStatus({ kind: "error", message: `Could not reach the server. ${fallback}` });
        return false;
      }
    };
    queue.current = queue.current.then(run, run);
    return queue.current;
  }

  const save = (edits: Partial<Values>) =>
    enqueue(
      "",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edits),
      },
      { kind: "saving" },
      { kind: "saved" },
      "The change was not saved.",
    );

  const commit = () =>
    enqueue(
      "/commit",
      { method: "POST" },
      { kind: "committing" },
      { kind: "committed" },
      "Nothing was written. Your edits are kept.",
    );

  const discard = () => {
    setConfirmingDiscard(false);
    return enqueue(
      "/discard",
      { method: "POST" },
      { kind: "discarding" },
      { kind: "discarded" },
      "Nothing was discarded.",
    );
  };

  const suggest = () => {
    const run = async (): Promise<boolean> => {
      setStatus({ kind: "suggesting" });
      try {
        const res = await fetch(`/api/pdf-documents/id/${documentId}/suggestions`, { method: "POST" });
        const body = (await res.json().catch(() => ({}))) as {
          suggestions?: Suggestions;
          error?: string;
          reauthorize?: boolean;
        };
        if (!res.ok || !body.suggestions) {
          setStatus({
            kind: "error",
            message: body.error ?? "No suggestions this time. Try again.",
            reauthorize: body.reauthorize,
          });
          return false;
        }
        const edits = suggestionEdits(latest.current, body.suggestions);
        if (Object.keys(edits).length === 0) {
          setStatus({ kind: "suggested", changed: false });
          return true;
        }
        const saved = await fetch(`/api/pdf-documents/id/${documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(edits),
        });
        if (!saved.ok) {
          const err = (await saved.json().catch(() => ({}))) as { error?: string };
          setStatus({ kind: "error", message: err.error ?? "The suggestions were not saved." });
          return false;
        }
        setStatus({ kind: "suggested", changed: true });
        router.refresh();
        return true;
      } catch {
        setStatus({ kind: "error", message: "Could not reach the server. Nothing was changed." });
        return false;
      }
    };
    queue.current = queue.current.then(run, run);
    return queue.current;
  };

  const busy = BUSY.has(status.kind);
  const changes = `${pendingCount} ${pendingCount === 1 ? "change" : "changes"}`;

  return (
    <>
      <div className="flex flex-col gap-5 p-5">
        <Button
          variant="secondary"
          className="min-h-11 w-full text-accent-primary"
          disabled={disabled || busy}
          onClick={() => void suggest()}
        >
          <span aria-hidden>✦</span>
          {status.kind === "suggesting" ? "Reading the document…" : "Suggest metadata"}
        </Button>
        {(Object.keys(LABELS) as TextField[]).map((field) => (
          <TextFieldEditor
            key={field}
            field={field}
            saved={values[field]}
            inFile={inFile ? inFile[field] : undefined}
            edited={edited.fields.includes(field)}
            disabled={disabled}
            onSave={(value) => save({ [field]: value })}
          />
        ))}
        <KeywordsEditor
          saved={values.keywords}
          inFile={inFile?.keywords}
          added={edited.keywordsAdded}
          removed={edited.keywordsRemoved}
          disabled={disabled}
          onSave={(keywords) => save({ keywords })}
        />
      </div>

      {/* Pinned to the bottom on a phone (frame 40:3), at the panel's foot on desktop. */}
      <div className="sticky bottom-0 mt-auto flex flex-col gap-3 border-t border-border bg-background-secondary p-5 text-xs lg:static">
        {pendingCount > 0 ? (
          <>
            <p className="text-text-muted">
              Saved here, not yet in the file. Nothing is written to Drive until you commit.
            </p>
            {confirmingDiscard ? (
              <div className="flex flex-col gap-3">
                <p className="text-text-primary">
                  Discard {changes}? Every field goes back to what the file says.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="min-h-11"
                    onClick={() => setConfirmingDiscard(false)}
                  >
                    Keep editing
                  </Button>
                  <Button
                    variant="destructive"
                    className="min-h-11 flex-1"
                    disabled={busy}
                    onClick={() => void discard()}
                  >
                    Discard {changes}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="min-h-11"
                  disabled={busy}
                  onClick={() => setConfirmingDiscard(true)}
                >
                  Discard
                </Button>
                <Button
                  className="min-h-11 flex-1"
                  disabled={busy}
                  onClick={() => void commit()}
                >
                  {status.kind === "committing" ? "Writing to Drive…" : `Commit ${changes}`}
                </Button>
              </div>
            )}
          </>
        ) : (
          <p className="text-text-muted">
            Changes save here as you make them. Nothing is written to Drive until you commit.
          </p>
        )}
        <p aria-live="polite" className="min-h-4">
          {status.kind === "saving" ? (
            <span className="text-text-muted">Saving…</span>
          ) : status.kind === "saved" ? (
            <span className="text-text-secondary">Saved</span>
          ) : status.kind === "committing" ? (
            <span className="text-text-muted">Writing to Drive…</span>
          ) : status.kind === "committed" ? (
            <span className="text-text-secondary">Written to Drive</span>
          ) : status.kind === "discarding" ? (
            <span className="text-text-muted">Discarding…</span>
          ) : status.kind === "suggesting" ? (
            <span className="text-text-muted">Reading the document for suggestions…</span>
          ) : status.kind === "suggested" ? (
            <span className="text-text-secondary">
              {status.changed
                ? "Suggestions added. Review them, then commit or discard."
                : "Nothing to change: the suggestions match what's here."}
            </span>
          ) : status.kind === "discarded" ? (
            <span className="text-text-secondary">Discarded. The fields match the file again.</span>
          ) : status.kind === "error" ? (
            <span role="alert" className="text-warning">
              {status.message}
              {status.reauthorize ? (
                <>
                  {" "}
                  <a href="/api/pdf-drive/connect" className="underline">
                    Sign in again
                  </a>
                </>
              ) : null}
              {status.conflict ? (
                <>
                  {" "}
                  <a href={`/pdf-metadata-viewer/id/${documentId}/compare`} className="underline">
                    Compare the two versions
                  </a>
                </>
              ) : null}
            </span>
          ) : null}
        </p>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Text fields
// ---------------------------------------------------------------------------

function FieldHeader({ htmlFor, label, marker }: { htmlFor?: string; label: string; marker: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <Label htmlFor={htmlFor} className="text-xs font-medium text-text-secondary">
        {label}
      </Label>
      {marker ? <span className="text-xs text-warning">{marker}</span> : null}
    </div>
  );
}

function TextFieldEditor({
  field,
  saved,
  inFile,
  edited,
  disabled,
  onSave,
}: {
  field: TextField;
  saved: string | null;
  inFile: string | null | undefined;
  edited: boolean;
  disabled: boolean;
  onSave: (value: string | null) => Promise<boolean>;
}) {
  const id = `pdf-field-${field}`;
  const helpId = `${id}-help`;
  const [draft, setDraft] = useState(saved ?? "");
  const focused = useRef(false);

  // A refresh after saving brings new props; adopt them unless mid-edit.
  useEffect(() => {
    if (!focused.current) setDraft(saved ?? "");
  }, [saved]);

  async function commitDraft() {
    focused.current = false;
    const next = draft.trim();
    if (next === (saved ?? "")) {
      setDraft(saved ?? "");
      return;
    }
    const ok = await onSave(next || null);
    // On failure keep what was typed in front of the user, with the error below.
    if (ok) setDraft(next);
  }

  const differs = inFile !== undefined && (saved ?? null) !== (inFile ?? null);

  return (
    <div className="flex flex-col gap-1.5">
      <FieldHeader htmlFor={id} label={LABELS[field]} marker={edited ? "edited" : null} />
      <Input
        id={id}
        value={draft}
        disabled={disabled}
        placeholder="—"
        aria-describedby={differs ? helpId : undefined}
        className="h-11"
        onFocus={() => {
          focused.current = true;
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(saved ?? "");
            focused.current = false;
            e.currentTarget.blur();
          }
        }}
      />
      {differs ? (
        <span id={helpId} className="text-xs text-text-muted">
          In the file: {inFile ?? "(empty)"}
        </span>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Keywords
// ---------------------------------------------------------------------------

function KeywordsEditor({
  saved,
  inFile,
  added,
  removed,
  disabled,
  onSave,
}: {
  saved: string[];
  inFile: string[] | undefined;
  added: string[];
  removed: string[];
  disabled: boolean;
  onSave: (keywords: string[]) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputId = "pdf-field-keyword-new";
  const errorId = `${inputId}-error`;

  const marker = [
    added.length ? `${added.length} added` : null,
    removed.length ? `${removed.length} removed` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const differs =
    inFile !== undefined &&
    (saved.length !== inFile.length || saved.some((k) => !inFile.includes(k)));

  async function add() {
    const k = draft.trim().replace(/,+$/, "");
    if (!k) return;
    if (/\s/.test(k)) {
      setError(`Keywords can't contain spaces. Use a hyphen instead, like ${k.replace(/\s+/g, "-")}.`);
      return;
    }
    setError(null);
    if (saved.includes(k)) {
      setDraft("");
      return;
    }
    if (await onSave([...saved, k])) setDraft("");
  }

  return (
    <div className="flex flex-col gap-1.5">
      <FieldHeader htmlFor={inputId} label="Keywords" marker={marker || null} />
      <ul className="flex flex-wrap items-center gap-2" aria-label="Keywords">
        {saved.map((k) => (
          <li
            key={k}
            className={`inline-flex items-center gap-0.5 rounded-full bg-background-primary py-0.5 pl-3 pr-0.5 text-xs ${
              added.includes(k) ? "text-warning" : "text-text-primary"
            }`}
          >
            {k}
            <button
              type="button"
              disabled={disabled}
              aria-label={`Remove keyword ${k}`}
              className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-full text-text-muted hover:bg-background-active hover:text-text-primary"
              onClick={() => onSave(saved.filter((x) => x !== k))}
            >
              ×
            </button>
          </li>
        ))}
        <li>
          <Input
            id={inputId}
            value={draft}
            disabled={disabled}
            placeholder="Add keyword"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="h-9 w-36 rounded-full text-xs"
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                void add();
              }
            }}
            onBlur={() => void add()}
          />
        </li>
      </ul>
      {error ? (
        <span id={errorId} role="alert" className="text-xs text-warning">
          {error}
        </span>
      ) : null}
      {differs && inFile ? (
        <span className="text-xs text-text-muted">
          In the file: {inFile.length > 0 ? inFile.join(", ") : "(empty)"}
        </span>
      ) : null}
    </div>
  );
}
