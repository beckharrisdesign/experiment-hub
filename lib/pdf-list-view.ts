/**
 * Finding documents in the list: search, keyword filters, sort (task 7e).
 * openspec/changes/pdf-metadata-viewer-cloud — design.md D13; Figma `02.13`.
 *
 * Pure, so the list in the browser and the detail page's Previous / Next on
 * the server work out the same order from the same page address.
 */
export const SORT_KEYS = ["filename", "title", "keywords", "pages", "state"] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export type SortDir = "asc" | "desc";

export interface ListView {
  /** What's in the search box. Every word must appear somewhere in the document. */
  q: string;
  /** Chosen keywords; a document must have all of them. */
  keywords: string[];
  sort: SortKey;
  dir: SortDir;
  /** Review pending: only documents with edits to write. */
  pending: boolean;
  /** Review prefilled: only documents with prefilled values to review (task 7i). */
  prefilled: boolean;
}

/** One document as the list shows it. Rows arrive Filename, Z to A. */
export interface ListRow {
  id: string;
  filename: string | null;
  title: string | null;
  subject: string | null;
  author: string | null;
  keywords: string[];
  pageCount: number | null;
  state: "pending" | "prefilled" | "split" | "untagged" | "committed";
  stateLabel: string;
  /** Its title or keywords are prefilled, not yet anyone's. */
  prefilledTitle?: boolean;
  prefilledKeywords?: boolean;
  /** Finds the kept pages of a row that asks to be split (task 7j). */
  revision?: string | null;
}

export const DEFAULT_VIEW: ListView = {
  q: "",
  keywords: [],
  sort: "filename",
  dir: "desc",
  pending: false,
  prefilled: false,
};

const MAX_Q = 200;
const MAX_KEYWORDS = 20;

/** What Next gives a page as `searchParams`. */
export type RawParams = Record<string, string | string[] | undefined>;

const all = (v: string | string[] | undefined): string[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];

/** Read a view from the page address. Anything unrecognised is ignored. */
export function parseListView(params: RawParams): ListView {
  const sort = all(params.sort)[0] as SortKey | undefined;
  const known = sort !== undefined && SORT_KEYS.includes(sort);
  const dir = all(params.dir)[0];
  const keywords: string[] = [];
  for (const raw of all(params.kw)) {
    const k = raw.trim().slice(0, MAX_Q);
    if (k && keywords.length < MAX_KEYWORDS && !hasKeyword(keywords, k)) keywords.push(k);
  }
  return {
    q: (all(params.q)[0] ?? "").slice(0, MAX_Q),
    keywords,
    sort: known ? sort : DEFAULT_VIEW.sort,
    dir:
      dir === "asc" || dir === "desc"
        ? dir
        : known && sort !== DEFAULT_VIEW.sort
          ? "asc"
          : DEFAULT_VIEW.dir,
    pending: all(params.pending)[0] === "1",
    // One review at a time; pending came first, so it wins.
    prefilled: all(params.prefilled)[0] === "1" && all(params.pending)[0] !== "1",
  };
}

/** The view as a query string: "" when it is the default, else "?…". */
export function listViewQuery(view: ListView): string {
  const p = new URLSearchParams();
  const q = view.q.trim();
  if (q) p.set("q", q);
  for (const k of view.keywords) p.append("kw", k);
  if (view.sort !== DEFAULT_VIEW.sort || view.dir !== DEFAULT_VIEW.dir) {
    p.set("sort", view.sort);
    p.set("dir", view.dir);
  }
  if (view.pending) p.set("pending", "1");
  else if (view.prefilled) p.set("prefilled", "1");
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function hasKeyword(keywords: string[], keyword: string): boolean {
  const k = keyword.toLowerCase();
  return keywords.some((x) => x.toLowerCase() === k);
}

export function toggleKeyword(view: ListView, keyword: string): ListView {
  const k = keyword.toLowerCase();
  return {
    ...view,
    keywords: hasKeyword(view.keywords, keyword)
      ? view.keywords.filter((x) => x.toLowerCase() !== k)
      : [...view.keywords, keyword],
  };
}

/** A column's first click sorts up; another reverses it. */
export function toggleSort(view: ListView, key: SortKey): ListView {
  if (view.sort !== key) return { ...view, sort: key, dir: "asc" };
  return { ...view, dir: view.dir === "asc" ? "desc" : "asc" };
}

/** Whether search or keywords are narrowing the list (Review pending aside). */
export function isFiltering(view: ListView): boolean {
  return view.q.trim() !== "" || view.keywords.length > 0;
}

function matches(row: ListRow, view: ListView): boolean {
  if (!view.keywords.every((k) => hasKeyword(row.keywords, k))) return false;
  const words = view.q.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  // Newline-joined: a word can't match across two fields, as it has no spaces.
  const text = [row.filename, row.title, row.subject, row.author, ...row.keywords]
    .filter((v): v is string => Boolean(v))
    .join("\n")
    .toLowerCase();
  return words.every((w) => text.includes(w));
}

const STATE_RANK: Record<ListRow["state"], number> = {
  pending: 0,
  prefilled: 1,
  split: 2,
  untagged: 3,
  committed: 4,
};

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

/** Null means blank, and blanks go last in both directions. */
function sortValue(row: ListRow, key: SortKey): string | number | null {
  switch (key) {
    case "title":
      return row.title || null;
    case "keywords":
      return row.keywords.length > 0 ? row.keywords.join(" ") : null;
    case "pages":
      return row.pageCount;
    case "state":
      return STATE_RANK[row.state];
    case "filename":
      return row.filename || null;
  }
}

/**
 * The rows a view shows, in order.
 *
 * `keepId` stays in however the view filters: the document being looked at may
 * have just been edited out of the filter, and Previous / Next still need to
 * know where it was.
 */
export function applyListView<T extends ListRow>(rows: T[], view: ListView, keepId?: string): T[] {
  const indexed = rows
    .map((row, i) => ({ row, i }))
    .filter(
      ({ row }) =>
        row.id === keepId ||
        ((!view.pending || row.state === "pending") &&
          (!view.prefilled || row.state === "prefilled") &&
          matches(row, view)),
    );
  const flip = view.dir === "asc" ? 1 : -1;
  indexed.sort((a, b) => {
    const va = sortValue(a.row, view.sort);
    const vb = sortValue(b.row, view.sort);
    if (va === null || vb === null) {
      if (va === null && vb === null) return a.i - b.i;
      return va === null ? 1 : -1;
    }
    // Rows arrive Filename, Z to A, so their order is the filename order —
    // the database's own, kept rather than compared again a second way.
    if (view.sort === "filename") return (b.i - a.i) * flip;
    const c =
      typeof va === "number" && typeof vb === "number"
        ? va - vb
        : collator.compare(String(va), String(vb));
    return c !== 0 ? c * flip : a.i - b.i;
  });
  return indexed.map(({ row }) => row);
}
