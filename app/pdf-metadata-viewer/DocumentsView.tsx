"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@beckharrisdesign/mvds";
import { DocumentsSection, type PendingDocument } from "./DocumentsSection";
import {
  applyListView,
  hasKeyword,
  isFiltering,
  listViewQuery,
  toggleKeyword,
  toggleSort,
  type ListRow,
  type ListView,
  type SortDir,
  type SortKey,
} from "@/lib/pdf-list-view";

/**
 * The document list, with search, keyword filters and sorting — Figma `02.13`
 * (77:178, 78:54, 78:486, 78:268; phone 79:157).
 * openspec/changes/pdf-metadata-viewer-cloud — task 7e; design.md D13.
 *
 * Everything happens on rows already here. The choices are kept in the page
 * address and passed along in every link, so a reload, Back, and the detail
 * page's Previous / Next all follow the list as it was left.
 */

const LIST_URL = "/pdf-metadata-viewer";

/** Browsers cap how often the address may be rewritten; typing is faster. */
const ADDRESS_DELAY = 250;

const COLUMNS: { key: SortKey; label: string; width: string }[] = [
  { key: "filename", label: "Filename", width: "" },
  { key: "title", label: "Title", width: "w-[18%]" },
  { key: "keywords", label: "Keywords", width: "w-[29%]" },
  { key: "pages", label: "Pages", width: "w-[92px]" },
  { key: "state", label: "State", width: "w-[158px]" },
];

/** The phone's sort menu: each column, both ways, in words. */
const SORT_OPTIONS: { key: SortKey; dir: SortDir; label: string }[] = [
  { key: "filename", dir: "desc", label: "Filename, Z to A" },
  { key: "filename", dir: "asc", label: "Filename, A to Z" },
  { key: "title", dir: "asc", label: "Title, A to Z" },
  { key: "title", dir: "desc", label: "Title, Z to A" },
  { key: "keywords", dir: "asc", label: "Keywords, A to Z" },
  { key: "keywords", dir: "desc", label: "Keywords, Z to A" },
  { key: "pages", dir: "desc", label: "Pages, most first" },
  { key: "pages", dir: "asc", label: "Pages, fewest first" },
  { key: "state", dir: "asc", label: "Pending first" },
  { key: "state", dir: "desc", label: "Committed first" },
];

/** Keywords that mean the file itself needs attention (as in v1). */
const WARNING_KEYWORDS = ["duplicate", "needs-deleting"];

function list(words: string[]): string {
  if (words.length < 2) return words.join("");
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

function nothingMatches(view: ListView): string {
  const q = view.q.trim();
  const kw =
    view.keywords.length === 0
      ? ""
      : `the ${view.keywords.length === 1 ? "keyword" : "keywords"} ${list(view.keywords)}`;
  const noun = view.pending ? "pending documents" : "documents";
  if (q && kw) return `No ${noun} match “${q}” with ${kw}`;
  if (q) return `No ${noun} match “${q}”`;
  if (kw) return `No ${noun} have ${kw}`;
  return "No documents have pending edits";
}

interface KeywordProps {
  keyword: string;
  on: boolean;
  onToggle: () => void;
}

function Keyword({ keyword, on, onToggle }: KeywordProps) {
  const warning = hasKeyword(WARNING_KEYWORDS, keyword);
  const tone = on
    ? ""
    : warning
      ? "border-warning bg-transparent text-warning hover:bg-background-active"
      : "bg-background-active text-text-secondary hover:bg-background-overlay";
  return (
    <Badge
      asChild
      variant={on ? "default" : "muted"}
      className={`min-h-8 max-w-full cursor-pointer lg:min-h-6 ${tone}`}
    >
      <button type="button" aria-pressed={on} onClick={onToggle}>
        <span className="truncate">{keyword}</span>
      </button>
    </Badge>
  );
}

function StatePill({ row }: { row: ListRow }) {
  if (row.state === "pending") {
    // Frame 34:172: the count in a warning pill, as on the detail page header.
    return (
      <span className="inline-flex items-center rounded-full bg-background-primary px-3 py-1 text-xs whitespace-nowrap text-warning">
        {row.stateLabel}
      </span>
    );
  }
  return <Badge variant="muted">{row.stateLabel}</Badge>;
}

interface DocumentsViewProps {
  /** Every document in the folder, Filename Z to A. */
  rows: ListRow[];
  /** Pending documents bulk commit will attempt, whatever the list shows. */
  pending: PendingDocument[];
  excluded: number;
  initialView: ListView;
}

export default function DocumentsView({ rows, pending, excluded, initialView }: DocumentsViewProps) {
  const [view, setView] = useState(initialView);
  const shown = useMemo(() => applyListView(rows, view), [rows, view]);
  const total = view.pending ? rows.filter((r) => r.state === "pending").length : rows.length;
  const filtering = isFiltering(view);
  const query = listViewQuery(view);
  const href = (row: ListRow) => `${LIST_URL}/id/${row.id}${query}`;

  // Keep the address in step, in place: Back should leave the list, not undo
  // keystrokes. The first render is already at its own address.
  const address = useRef(listViewQuery(initialView));
  useEffect(() => {
    if (query === address.current) return;
    const write = () => {
      if (query === address.current) return;
      address.current = query;
      window.history.replaceState(null, "", `${LIST_URL}${query}`);
    };
    const timer = setTimeout(write, ADDRESS_DELAY);
    // Leaving before the delay is up still remembers the list.
    window.addEventListener("pagehide", write);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pagehide", write);
    };
  }, [query]);

  // The column names stick right under the search row, whose height changes as
  // keyword filters wrap.
  const find = useRef<HTMLDivElement>(null);
  const [findHeight, setFindHeight] = useState(68);
  useEffect(() => {
    if (!find.current || typeof ResizeObserver === "undefined") return;
    const el = find.current;
    const observer = new ResizeObserver(() => setFindHeight(Math.floor(el.offsetHeight)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const clear = () => setView((v) => ({ ...v, q: "", keywords: [] }));
  const toggle = (keyword: string) => setView((v) => toggleKeyword(v, keyword));

  const keywordTags = (row: ListRow) =>
    row.keywords.map((k) => (
      <Keyword
        key={k}
        keyword={k}
        on={hasKeyword(view.keywords, k)}
        onToggle={() => toggle(k)}
      />
    ));

  const empty =
    shown.length === 0 ? (
      <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
        <span className="text-sm font-semibold text-text-primary">{nothingMatches(view)}</span>
        {filtering ? (
          <Button variant="link" className="min-h-11 text-text-secondary underline" onClick={clear}>
            Clear all
          </Button>
        ) : null}
      </div>
    ) : null;

  return (
    <DocumentsSection
      pending={pending}
      excluded={excluded}
      reviewing={view.pending}
      toggleHref={`${LIST_URL}${listViewQuery({ ...view, pending: !view.pending })}`}
    >
      <div>
        {/* ── Find ─────────────────────────────────────────────────────── */}
        <div
          ref={find}
          className="flex flex-col gap-3 pb-3 lg:sticky lg:top-0 lg:-mt-3 lg:z-20 lg:flex-row lg:flex-wrap lg:items-center lg:bg-background-primary lg:pt-3"
        >
          <div className="relative w-full lg:w-[360px]">
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
            >
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5 14 14" />
            </svg>
            <Input
              type="search"
              size="lg"
              aria-label="Search documents"
              placeholder="Search documents"
              autoComplete="off"
              maxLength={200}
              value={view.q}
              onChange={(e) => {
                const q = e.target.value;
                setView((v) => ({ ...v, q }));
              }}
              // 16px on a phone, so iOS doesn't zoom the page on focus.
              className={`min-h-11 w-full bg-background-secondary pl-10 dark:bg-background-secondary text-base lg:text-sm ${
                view.q ? "border-accent-primary" : ""
              }`}
            />
          </div>

          {filtering ? (
            <div className="flex flex-wrap items-center gap-2">
              {view.keywords.map((k) => (
                <span
                  key={k}
                  className="inline-flex items-center rounded-full border border-border bg-background-active pl-3.5 text-sm font-medium text-text-primary"
                >
                  {k}
                  <button
                    type="button"
                    aria-label={`Remove ${k}`}
                    onClick={() => toggle(k)}
                    className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-text-secondary hover:bg-background-active lg:size-8"
                  >
                    <span aria-hidden>×</span>
                  </button>
                </span>
              ))}
              <Button variant="link" className="min-h-11 px-2 text-text-secondary underline" onClick={clear}>
                Clear all
              </Button>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3 lg:ml-auto">
            <span aria-live="polite" className="text-sm font-medium text-text-primary">
              {filtering ? `${shown.length} of ${total} ${total === 1 ? "document" : "documents"}` : ""}
            </span>
            <div className="lg:hidden">
              <Select
                value={`${view.sort}:${view.dir}`}
                onValueChange={(value) => {
                  const option = SORT_OPTIONS.find((o) => `${o.key}:${o.dir}` === value);
                  if (option) setView((v) => ({ ...v, sort: option.key, dir: option.dir }));
                }}
              >
                <SelectTrigger
                  aria-label="Sort"
                  className="min-h-11 bg-background-secondary text-text-primary dark:bg-background-secondary"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((o) => (
                    <SelectItem key={`${o.key}:${o.dir}`} value={`${o.key}:${o.dir}`}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ── Table, on wide screens ───────────────────────────────────── */}
        {/* No overflow here: a scrolling wrapper would stop the column names
            sticking to the page. The columns are fixed shares, so it fits. */}
        <div className="hidden rounded-lg bg-background-secondary lg:block">
          <table className="w-full table-fixed text-left text-sm">
            <thead>
              <tr>
                {COLUMNS.map((c) => {
                  const on = view.sort === c.key;
                  return (
                    <th
                      key={c.key}
                      scope="col"
                      aria-sort={on ? (view.dir === "asc" ? "ascending" : "descending") : undefined}
                      style={{ top: findHeight }}
                      className={`sticky z-10 border-b border-border bg-background-secondary p-0 text-xs first:rounded-tl-lg last:rounded-tr-lg ${c.width}`}
                    >
                      <button
                        type="button"
                        onClick={() => setView((v) => toggleSort(v, c.key))}
                        className={`flex min-h-11 w-full cursor-pointer items-center gap-1.5 px-4 hover:text-text-primary ${
                          on
                            ? "font-semibold text-text-primary"
                            : "font-medium text-muted-foreground"
                        }`}
                      >
                        {c.label}
                        <span aria-hidden className={on ? "text-text-secondary" : ""}>
                          {on ? (view.dir === "asc" ? "↑" : "↓") : "↕"}
                        </span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 [overflow-wrap:anywhere] text-text-primary">
                    <a href={href(row)} className="hover:underline">
                      {row.filename ?? "(unnamed)"}
                    </a>
                  </td>
                  <td className="px-4 py-3 [overflow-wrap:anywhere] text-muted-foreground">
                    {row.title ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.keywords.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">{keywordTags(row)}</div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.pageCount ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatePill row={row} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {empty}
        </div>

        {/* ── List, on a phone ─────────────────────────────────────────── */}
        <div className="rounded-lg bg-background-secondary lg:hidden">
          <ul>
            {shown.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-2 border-b border-border p-4 text-sm last:border-0"
              >
                <a
                  href={href(row)}
                  className="font-medium [overflow-wrap:anywhere] text-text-primary hover:underline"
                >
                  {row.filename ?? "(unnamed)"}
                </a>
                {row.title ? <span className="text-muted-foreground">{row.title}</span> : null}
                {row.keywords.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">{keywordTags(row)}</div>
                ) : null}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">
                    {row.pageCount === null
                      ? "—"
                      : `${row.pageCount} ${row.pageCount === 1 ? "page" : "pages"}`}
                  </span>
                  <StatePill row={row} />
                </div>
              </li>
            ))}
          </ul>
          {empty}
        </div>
      </div>
    </DocumentsSection>
  );
}
