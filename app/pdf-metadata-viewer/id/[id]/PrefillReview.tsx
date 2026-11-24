"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@beckharrisdesign/mvds";
import type { Prefill } from "@/lib/pdf-prefill";
import { suggestionEdits } from "./DetailsEditor";

/**
 * The details panel for a document nobody has touched yet, filled in from its
 * own text — Figma `02.17`, frames 88:475 and 88:604 (phone).
 * openspec/changes/pdf-metadata-viewer-cloud — task 7i; design.md D16.
 *
 * Unlike the ordinary panel, nothing here saves as it changes: it is all one
 * answer to review. Accept makes an ordinary edit of what is shown; Dismiss
 * clears it, for this version of the file. "Suggest with AI" is the full AI
 * version, and the only thing called a suggestion.
 */

interface Values {
  title: string | null;
  subject: string | null;
  author: string | null;
  keywords: string[];
}

interface PrefillReviewProps {
  documentId: string;
  revision: string;
  /** What the document says now, without the prefilled values. */
  values: Values;
  prefill: Prefill;
  /** Where Accept and next goes: the next prefilled document, or the list. */
  nextUrl: string;
  nextIsDocument: boolean;
}

type Status =
  | { kind: "idle" }
  | { kind: "working"; what: "accept" | "next" | "dismiss" | "suggest" }
  | { kind: "error"; message: string; reauthorize?: boolean };

/** One line for all the keywords: each reason once, in the order first given. */
export function keywordReasons(prefill: Prefill, shown: string[]): string {
  const reasons = shown.map((k) => prefill.why[k]).filter(Boolean);
  return [...new Set(reasons)].map((r) => `${r}.`).join(" ");
}

export default function PrefillReview({
  documentId,
  revision,
  values,
  prefill,
  nextUrl,
  nextIsDocument,
}: PrefillReviewProps) {
  const router = useRouter();
  const [title, setTitle] = useState(prefill.title ?? values.title ?? "");
  const [subject, setSubject] = useState(values.subject ?? "");
  const [author, setAuthor] = useState(values.author ?? "");
  const [keywords, setKeywords] = useState(prefill.keywords);
  const [draft, setDraft] = useState("");
  const [keywordError, setKeywordError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  // Two quick presses must not make two requests.
  const working = useRef(false);
  const busy = status.kind === "working";
  const keywordId = useId();
  const stillPrefilled = keywords.filter((k) => prefill.keywords.includes(k)).length;

  function add(): string[] | null {
    const k = draft.trim().replace(/,+$/, "");
    if (!k) return keywords;
    if (/\s/.test(k)) {
      setKeywordError(`Keywords can't contain spaces. Use a hyphen instead, like ${k.replace(/\s+/g, "-")}.`);
      return null;
    }
    setKeywordError(null);
    setDraft("");
    const next = keywords.includes(k) ? keywords : [...keywords, k];
    setKeywords(next);
    return next;
  }

  async function run(
    what: "accept" | "next" | "dismiss" | "suggest",
    work: () => Promise<{ ok: true; go: () => void } | { ok: false; message: string; reauthorize?: boolean }>,
  ) {
    if (working.current) return;
    working.current = true;
    setStatus({ kind: "working", what });
    try {
      const result = await work();
      if (result.ok) {
        setStatus({ kind: "idle" });
        result.go();
      } else {
        setStatus({ kind: "error", message: result.message, reauthorize: result.reauthorize });
      }
    } catch {
      setStatus({ kind: "error", message: "Could not reach the server. Nothing was saved." });
    } finally {
      working.current = false;
    }
  }

  async function send(path: string, method: "POST" | "PATCH", body?: unknown) {
    const res = await fetch(`/api/pdf-documents/id/${documentId}${path}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as {
      error?: string;
      reauthorize?: boolean;
      suggestions?: { title: string; subject: string; keywords: string[] };
    };
    return { res, json };
  }

  function accept(next: boolean) {
    // What was typed and not yet added counts as shown.
    const all = add();
    if (!all) return;
    void run(next ? "next" : "accept", async () => {
      const { res, json } = await send("", "PATCH", {
        title: title.trim() || null,
        subject: subject.trim() || null,
        author: author.trim() || null,
        keywords: all,
      });
      if (!res.ok) {
        return { ok: false, message: json.error ?? "Nothing was saved. Try again.", reauthorize: json.reauthorize };
      }
      return {
        ok: true,
        go: () => {
          if (next) router.push(nextUrl);
          router.refresh();
        },
      };
    });
  }

  const dismiss = () =>
    void run("dismiss", async () => {
      const { res, json } = await send("/prefill/dismiss", "POST", { revision });
      if (!res.ok) return { ok: false, message: json.error ?? "Not dismissed. Try again." };
      return { ok: true, go: () => router.refresh() };
    });

  const suggest = () =>
    void run("suggest", async () => {
      const { res, json } = await send("/suggestions", "POST");
      if (!res.ok || !json.suggestions) {
        return { ok: false, message: json.error ?? "No suggestions this time. Try again.", reauthorize: json.reauthorize };
      }
      // Against the document itself: the AI's answer replaces what's prefilled.
      const edits = suggestionEdits(values, json.suggestions);
      if (Object.keys(edits).length === 0) {
        return { ok: false, message: "The AI had nothing to add. What's prefilled is still here." };
      }
      const saved = await send("", "PATCH", edits);
      if (!saved.res.ok) {
        return { ok: false, message: saved.json.error ?? "The suggestions were not saved." };
      }
      return { ok: true, go: () => router.refresh() };
    });

  const field = (
    id: string,
    label: string,
    value: string,
    set: (v: string) => void,
    prefilled: boolean,
    why?: string,
  ) => (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id} className="text-xs font-medium text-text-secondary">
          {label}
        </Label>
        {prefilled ? <span className="text-xs text-text-secondary">prefilled</span> : null}
      </div>
      <Input
        id={id}
        value={value}
        disabled={busy}
        placeholder="—"
        maxLength={1000}
        aria-describedby={prefilled && why ? `${id}-why` : undefined}
        className={`h-11 ${prefilled ? "border-dashed border-muted-foreground" : ""}`}
        onChange={(e) => set(e.target.value)}
      />
      {prefilled && why ? (
        <span id={`${id}-why`} className="text-xs text-muted-foreground">
          {why}
        </span>
      ) : null}
    </div>
  );

  return (
    <>
      <div className="flex flex-col gap-5 p-5">
        <Button
          variant="secondary"
          className="min-h-11 w-full text-accent-primary"
          disabled={busy}
          onClick={suggest}
        >
          <span aria-hidden>✦</span>
          {status.kind === "working" && status.what === "suggest" ? "Reading the document…" : "Suggest with AI"}
        </Button>
        {field(
          "pdf-prefill-title",
          "Title",
          title,
          setTitle,
          prefill.title !== null && title === prefill.title,
          prefill.why.title,
        )}
        {field("pdf-prefill-subject", "Subject", subject, setSubject, false)}
        {field("pdf-prefill-author", "Author", author, setAuthor, false)}

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor={keywordId} className="text-xs font-medium text-text-secondary">
              Keywords
            </Label>
            {stillPrefilled > 0 ? (
              <span className="text-xs text-text-secondary">{stillPrefilled} prefilled</span>
            ) : null}
          </div>
          <ul className="flex flex-wrap items-center gap-2" aria-label="Keywords">
            {keywords.map((k) => (
              <li
                key={k}
                title={prefill.why[k]}
                className={`inline-flex items-center gap-0.5 rounded-full pl-3 text-xs ${
                  prefill.keywords.includes(k)
                    ? "border border-dashed border-muted-foreground text-text-secondary"
                    : "bg-background-primary text-text-primary"
                }`}
              >
                {k}
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Remove keyword ${k}`}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-background-active hover:text-text-primary lg:min-h-8 lg:min-w-8"
                  onClick={() => setKeywords((all) => all.filter((x) => x !== k))}
                >
                  ×
                </button>
              </li>
            ))}
            <li>
              <Input
                id={keywordId}
                value={draft}
                disabled={busy}
                placeholder="Add keyword"
                aria-invalid={keywordError ? true : undefined}
                className="h-9 w-36 rounded-full text-xs"
                onChange={(e) => {
                  setDraft(e.target.value);
                  if (keywordError) setKeywordError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    add();
                  }
                }}
              />
            </li>
          </ul>
          {keywordError ? (
            <span role="alert" className="text-xs text-warning">
              {keywordError}
            </span>
          ) : null}
          {stillPrefilled > 0 ? (
            <span className="text-xs text-muted-foreground">{keywordReasons(prefill, keywords)}</span>
          ) : null}
        </div>
      </div>

      <div className="sticky bottom-0 z-10 mt-auto flex flex-col gap-3 border-t border-border bg-background-secondary p-5 text-xs">
        <p className="text-muted-foreground">
          Prefilled from the document&apos;s text. Nothing is saved until you accept, and Commit leaves these out.
        </p>
        {status.kind === "error" ? (
          <p role="alert" className="text-warning">
            {status.message}{" "}
            {status.reauthorize ? (
              <a href="/api/pdf-drive/connect" className="underline">
                Sign in again
              </a>
            ) : null}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" className="min-h-11" disabled={busy} onClick={dismiss}>
            {status.kind === "working" && status.what === "dismiss" ? "Dismissing…" : "Dismiss"}
          </Button>
          <Button variant="outline" className="min-h-11" disabled={busy} onClick={() => accept(false)}>
            {status.kind === "working" && status.what === "accept" ? "Accepting…" : "Accept"}
          </Button>
          <Button className="min-h-11 flex-1" disabled={busy} onClick={() => accept(true)}>
            {status.kind === "working" && status.what === "next"
              ? "Accepting…"
              : nextIsDocument
                ? "Accept and next ›"
                : "Accept and finish"}
          </Button>
        </div>
      </div>
    </>
  );
}
