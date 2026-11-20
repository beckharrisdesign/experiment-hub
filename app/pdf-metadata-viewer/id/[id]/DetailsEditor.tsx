"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Label } from "@beckharrisdesign/mvds";

/**
 * Editable details panel — Figma `02.9` frame `34:289`, `02.10` frame `40:3`.
 * openspec/changes/pdf-metadata-viewer-cloud — tasks 8.1, 9.4.
 *
 * Every change saves as it is made (a text field on blur or Enter, a keyword on
 * add or remove) and lands as a staged edit: saved here, not yet in the file.
 * Writing to Drive is a separate, explicit step that this panel does not offer
 * yet. Suggest metadata is out of scope until the vision route exists.
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
  | { kind: "error"; message: string; reauthorize?: boolean };

export function DetailsEditor({ documentId, values, inFile, edited, disabled }: DetailsEditorProps) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  // Saves run one at a time, in the order made: two quick edits must not land
  // out of order, and the first edit's baseline read must finish before the next.
  const queue = useRef<Promise<boolean>>(Promise.resolve(true));

  function save(edits: Partial<Values>): Promise<boolean> {
    const run = async (): Promise<boolean> => {
      setStatus({ kind: "saving" });
      try {
        const res = await fetch(`/api/pdf-documents/id/${documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(edits),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
            reauthorize?: boolean;
          };
          setStatus({
            kind: "error",
            message: body.error ?? "Could not save the change",
            reauthorize: body.reauthorize,
          });
          return false;
        }
        setStatus({ kind: "saved" });
        router.refresh();
        return true;
      } catch {
        setStatus({ kind: "error", message: "Could not reach the server. The change was not saved." });
        return false;
      }
    };
    queue.current = queue.current.then(run, run);
    return queue.current;
  }

  return (
    <>
      <div className="flex flex-col gap-5 p-5">
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

      <div className="mt-auto flex flex-col gap-1 border-t border-border p-5 text-xs">
        <p className="text-text-muted">
          Saved here, not yet in the file. Writing changes to Drive comes next.
        </p>
        <p aria-live="polite" className="min-h-4">
          {status.kind === "saving" ? (
            <span className="text-text-muted">Saving…</span>
          ) : status.kind === "saved" ? (
            <span className="text-text-secondary">Saved</span>
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
