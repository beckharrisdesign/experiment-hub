"use client";

import { useMemo, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@beckharrisdesign/mvds";
import type { KeywordTableRow } from "@/types";
import {
  bulkValueLabel,
  demandRatio,
  totalTagOccurrences,
} from "@/lib/keyword-metrics";

type Direction = "asc" | "desc";

const ALL = "__all__";
const NO_RANGE = "__none__";

/**
 * Which instrument produced a column. Every source gets a band above its own
 * short, unprefixed headers (design.md, round 01 Option A).
 *
 * The deciding constraint is name collision, not column count: KD appears
 * three times, and Avg searches / Avg clicks / Avg CTR / Etsy comp. twice
 * each — nine of the twenty columns share a name with another column. A band
 * resolves that once per source; per-header prefixes would resolve it
 * nineteen times and cost ~200px of width for the same rows.
 */
type GroupKey =
  | "keyword"
  | "kt"
  | "bulk"
  | "tag"
  | "ranked"
  | "targeting"
  | "shop"
  | "ads";

/**
 * `window` is rendered in the band label, not a footnote.
 *
 * Shop covers the year; Etsy Ads keyword data covers the last 30 days. A
 * reader who misses that will divide one into the other and get a number
 * that corresponds to no period at all, so the scope is written where the
 * columns are read.
 */
const GROUPS: { key: GroupKey; label: string; window?: string }[] = [
  { key: "keyword", label: "" },
  { key: "kt", label: "eRank Keyword Tool" },
  { key: "bulk", label: "eRank Bulk Keywords" },
  { key: "tag", label: "eRank Tag Report" },
  { key: "ranked", label: "Ranked" },
  { key: "targeting", label: "Targeting" },
  { key: "shop", label: "Shop — captured", window: "this year" },
  { key: "ads", label: "Etsy Ads — targeted", window: "last 30 days" },
];

/**
 * Columns as data rather than as twenty branches of a switch.
 *
 * `value` is the single source of truth for a column's number: sorting and
 * range filtering both read it, so they cannot disagree about what a column
 * means or about when it is blank. A column without `value` is not numeric
 * and is not range-filterable.
 */
interface Column {
  key: string;
  label: string;
  group: GroupKey;
  numeric?: boolean;
  /** Numeric value for sort + range. `null` means blank — never a `0`. */
  value?: (row: KeywordTableRow) => number | null;
  /**
   * Sort-only numeric key for a column that is not itself numeric, so it
   * sorts by a number without becoming range-filterable or right-aligned.
   * Found via is the only one: it renders a query list but has always sorted
   * by total tag occurrences.
   */
  sortNumber?: (row: KeywordTableRow) => number;
  /** String value for sorting a non-numeric column. */
  text?: (row: KeywordTableRow) => string;
  render: (row: KeywordTableRow) => string;
}

/** A plain number, or an em dash. Never `0` standing in for "no data". */
function num(value: number | null): string {
  return value === null ? "—" : value.toLocaleString();
}

const COLUMNS: Column[] = [
  {
    key: "keyword",
    label: "Keyword",
    group: "keyword",
    text: (r) => r.keyword,
    render: (r) => r.keyword,
  },

  // --- eRank Keyword Tool ---
  {
    key: "kt.searches",
    label: "Searches",
    group: "kt",
    numeric: true,
    value: (r) => r.keywordTool?.searches ?? null,
    render: (r) => num(r.keywordTool?.searches ?? null),
  },
  {
    key: "kt.competition",
    label: "Competition",
    group: "kt",
    numeric: true,
    value: (r) => r.keywordTool?.competition ?? null,
    render: (r) => num(r.keywordTool?.competition ?? null),
  },
  {
    key: "kt.kd",
    label: "KD",
    group: "kt",
    numeric: true,
    value: (r) => r.keywordTool?.kd ?? null,
    render: (r) => num(r.keywordTool?.kd ?? null),
  },
  {
    // Tag occurrences stay per query. `embroidery font` read 6, 81, 80 and 12
    // under four queries on one day; one merged number would be invented.
    key: "kt.foundVia",
    label: "Found via",
    group: "kt",
    sortNumber: (r) => totalTagOccurrences(r.keywordTool),
    render: (r) => {
      const hits = r.keywordTool?.foundVia ?? [];
      if (hits.length === 0) return "—";
      return hits.map((hit) => `${hit.query} (${hit.tagOccurrences})`).join(", ");
    },
  },
  {
    key: "kt.ratio",
    label: "S / comp.",
    group: "kt",
    numeric: true,
    value: (r) => demandRatio(r.keywordTool),
    render: (r) => {
      const ratio = demandRatio(r.keywordTool);
      return ratio === null ? "—" : ratio.toFixed(3);
    },
  },

  // --- eRank Bulk Keywords ---
  {
    key: "bulk.avgSearches",
    label: "Avg searches",
    group: "bulk",
    numeric: true,
    value: (r) => r.bulkKeywords?.avgSearches ?? null,
    render: (r) =>
      r.bulkKeywords
        ? bulkValueLabel(r.bulkKeywords.avgSearches, r.bulkKeywords.avgSearchesCensored)
        : "—",
  },
  {
    key: "bulk.avgClicks",
    label: "Avg clicks",
    group: "bulk",
    numeric: true,
    value: (r) => r.bulkKeywords?.avgClicks ?? null,
    render: (r) =>
      r.bulkKeywords
        ? bulkValueLabel(r.bulkKeywords.avgClicks, r.bulkKeywords.avgClicksCensored)
        : "—",
  },
  {
    key: "bulk.avgCtr",
    label: "Avg CTR",
    group: "bulk",
    numeric: true,
    value: (r) => r.bulkKeywords?.avgCtr ?? null,
    render: (r) =>
      r.bulkKeywords
        ? bulkValueLabel(r.bulkKeywords.avgCtr, r.bulkKeywords.avgCtrCensored)
        : "—",
  },
  {
    key: "bulk.etsyCompetition",
    label: "Etsy comp.",
    group: "bulk",
    numeric: true,
    value: (r) => r.bulkKeywords?.etsyCompetition ?? null,
    render: (r) => num(r.bulkKeywords?.etsyCompetition ?? null),
  },
  {
    key: "bulk.kd",
    label: "KD",
    group: "bulk",
    numeric: true,
    value: (r) => r.bulkKeywords?.kd ?? null,
    render: (r) => num(r.bulkKeywords?.kd ?? null),
  },

  // --- eRank Tag Report ---
  {
    key: "tag.tagOccurrences",
    label: "Tag occ.",
    group: "tag",
    numeric: true,
    value: (r) => r.tagReport?.tagOccurrences ?? null,
    render: (r) => num(r.tagReport?.tagOccurrences ?? null),
  },
  {
    key: "tag.avgSearches",
    label: "Avg searches",
    group: "tag",
    numeric: true,
    value: (r) => r.tagReport?.avgSearches ?? null,
    render: (r) =>
      r.tagReport
        ? bulkValueLabel(r.tagReport.avgSearches, r.tagReport.avgSearchesCensored)
        : "—",
  },
  {
    key: "tag.avgClicks",
    label: "Avg clicks",
    group: "tag",
    numeric: true,
    value: (r) => r.tagReport?.avgClicks ?? null,
    render: (r) =>
      r.tagReport
        ? bulkValueLabel(r.tagReport.avgClicks, r.tagReport.avgClicksCensored)
        : "—",
  },
  {
    key: "tag.avgCtr",
    label: "Avg CTR",
    group: "tag",
    numeric: true,
    value: (r) => r.tagReport?.avgCtr ?? null,
    render: (r) =>
      r.tagReport
        ? bulkValueLabel(r.tagReport.avgCtr, r.tagReport.avgCtrCensored)
        : "—",
  },
  {
    key: "tag.etsyCompetition",
    label: "Etsy comp.",
    group: "tag",
    numeric: true,
    value: (r) => r.tagReport?.etsyCompetition ?? null,
    render: (r) => num(r.tagReport?.etsyCompetition ?? null),
  },
  {
    key: "tag.kd",
    label: "KD",
    group: "tag",
    numeric: true,
    value: (r) => r.tagReport?.kd ?? null,
    render: (r) => num(r.tagReport?.kd ?? null),
  },
  {
    key: "tag.googleSearches",
    label: "Google",
    group: "tag",
    numeric: true,
    value: (r) => r.tagReport?.googleSearches ?? null,
    render: (r) => num(r.tagReport?.googleSearches ?? null),
  },

  // --- Real-world traction ---
  {
    // Best (lowest) position across every ranking listing; blank, never 0,
    // when there is no Spotted on Etsy match.
    key: "ranked",
    label: "Best pos.",
    group: "ranked",
    numeric: true,
    value: (r) => r.ranked,
    render: (r) => num(r.ranked),
  },
  {
    // Lowest matching tag slot (1–13) across every current listing; blank,
    // never 0, when untargeted.
    key: "targeting",
    label: "Tag slot",
    group: "targeting",
    numeric: true,
    value: (r) => r.targeting,
    render: (r) => num(r.targeting),
  },

  // --- Shop: captured search terms (visits, i.e. arrivals) ---
  {
    key: "shop.visits",
    label: "Visits",
    group: "shop",
    numeric: true,
    value: (r) => r.shopSearch?.visits ?? null,
    render: (r) => num(r.shopSearch?.visits ?? null),
  },
  {
    key: "shop.etsy",
    label: "Etsy",
    group: "shop",
    numeric: true,
    value: (r) => r.shopSearch?.etsyVisits ?? null,
    render: (r) => num(r.shopSearch?.etsyVisits ?? null),
  },
  {
    key: "shop.google",
    label: "Google",
    group: "shop",
    numeric: true,
    value: (r) => r.shopSearch?.googleVisits ?? null,
    render: (r) => num(r.shopSearch?.googleVisits ?? null),
  },
  {
    key: "shop.listing",
    label: "Listing",
    group: "shop",
    text: (r) => r.shopSearch?.listingTitle ?? "",
    render: (r) => r.shopSearch?.listingTitle ?? "—",
  },
  {
    // The listing's own numbers, not the term's. One visit from this term did
    // not itself produce this revenue — see design.md decision on labelling.
    key: "shop.sold",
    label: "L. sold",
    group: "shop",
    numeric: true,
    value: (r) => r.shopSearch?.listingItemsSold ?? null,
    render: (r) => num(r.shopSearch?.listingItemsSold ?? null),
  },
  {
    key: "shop.revenue",
    label: "L. revenue",
    group: "shop",
    numeric: true,
    value: (r) => r.shopSearch?.listingRevenueUsd ?? null,
    render: (r) => {
      const v = r.shopSearch?.listingRevenueUsd;
      return v === null || v === undefined ? "—" : `$${v.toFixed(2)}`;
    },
  },

  // --- Etsy Ads: targeted keywords (views, i.e. impressions) ---
  {
    key: "ads.views",
    label: "Views",
    group: "ads",
    numeric: true,
    value: (r) => r.ads?.views ?? null,
    render: (r) => num(r.ads?.views ?? null),
  },
  {
    key: "ads.clicks",
    label: "Clicks",
    group: "ads",
    numeric: true,
    value: (r) => r.ads?.clicks ?? null,
    render: (r) => num(r.ads?.clicks ?? null),
  },
  {
    key: "ads.ctr",
    label: "Click rate",
    group: "ads",
    numeric: true,
    value: (r) => r.ads?.clickRatePct ?? null,
    render: (r) => {
      const v = r.ads?.clickRatePct;
      return v === null || v === undefined ? "—" : `${v}%`;
    },
  },
  {
    key: "ads.spend",
    label: "Spend",
    group: "ads",
    numeric: true,
    value: (r) => r.ads?.spendUsd ?? null,
    render: (r) => {
      const v = r.ads?.spendUsd;
      return v === null || v === undefined ? "—" : `$${v.toFixed(2)}`;
    },
  },
  {
    key: "ads.revenue",
    label: "Revenue",
    group: "ads",
    numeric: true,
    value: (r) => r.ads?.revenueUsd ?? null,
    render: (r) => {
      const v = r.ads?.revenueUsd;
      return v === null || v === undefined ? "—" : `$${v.toFixed(2)}`;
    },
  },
  {
    key: "ads.orders",
    label: "Orders",
    group: "ads",
    numeric: true,
    value: (r) => r.ads?.orders ?? null,
    render: (r) => num(r.ads?.orders ?? null),
  },
  {
    key: "ads.roas",
    label: "ROAS",
    group: "ads",
    numeric: true,
    value: (r) => r.ads?.roas ?? null,
    render: (r) => num(r.ads?.roas ?? null),
  },
];

const RANGE_COLUMNS = COLUMNS.filter((c) => c.value);

const SOURCE_FILTERS: {
  key: string;
  label: string;
  has: (row: KeywordTableRow) => boolean;
}[] = [
  { key: "kt", label: "Keyword Tool", has: (r) => r.keywordTool !== null },
  { key: "bulk", label: "Bulk Keywords", has: (r) => r.bulkKeywords !== null },
  { key: "tag", label: "Tag Report", has: (r) => r.tagReport !== null },
  { key: "ranked", label: "Ranked", has: (r) => r.ranked !== null },
  { key: "targeting", label: "Targeting", has: (r) => r.targeting !== null },
  { key: "shop", label: "Shop — captured", has: (r) => r.shopSearch !== null },
  { key: "ads", label: "Etsy Ads", has: (r) => r.ads !== null },
];

/**
 * A min bound asserts "at or above X" — a blank value can't confirm that, so
 * it is excluded. A max-only bound asserts a ceiling only; a blank value
 * contradicts nothing about a ceiling, so it stays included. This mirrors
 * `keyword-corpus`'s "absence is not a verdict" rule rather than treating an
 * unknown value as if it were 0.
 */
function passesRange(
  value: number | null,
  min: number | null,
  max: number | null,
): boolean {
  if (min === null && max === null) return true;
  if (value === null) return min === null;
  if (min !== null && value < min) return false;
  if (max !== null && value > max) return false;
  return true;
}

/** One active numeric filter. Several are held at once and AND together. */
interface RangeFilter {
  id: number;
  key: string;
  min: string;
  max: string;
}

/** One active sort key. At most two are held; the second breaks ties. */
interface SortKey {
  key: string;
  direction: Direction;
}

const groupLabel = (key: GroupKey) =>
  GROUPS.find((g) => g.key === key)?.label ?? "";

/** `"eRank Keyword Tool — KD"`. The picker is flat, so the source has to be
 *  spelled out: three different columns are named KD. */
const qualified = (c: Column) =>
  groupLabel(c.group) ? `${groupLabel(c.group)} — ${c.label}` : c.label;

/**
 * CSV escaping: quote everything and double any inner quote.
 *
 * Quoting unconditionally rather than only when a comma is present keeps a
 * captured term's own punctuation, and any leading `<` from a censored value,
 * from being reinterpreted by a spreadsheet.
 */
function csvCell(text: string): string {
  return `"${text.replace(/"/g, '""')}"`;
}

function buildCsv(rows: KeywordTableRow[]): string {
  const header = COLUMNS.map((c) => csvCell(qualified(c))).join(",");
  const body = rows.map((row) =>
    COLUMNS.map((c) => csvCell(c.render(row))).join(","),
  );
  return [header, ...body].join("\n");
}

interface KeywordTableProps {
  rows: KeywordTableRow[];
}

export default function KeywordTable({ rows }: KeywordTableProps) {
  const [sorts, setSorts] = useState<SortKey[]>([
    { key: "kt.searches", direction: "desc" },
  ]);
  const [keywordFilter, setKeywordFilter] = useState("");
  const [captureFilter, setCaptureFilter] = useState(ALL);
  const [queryFilter, setQueryFilter] = useState(ALL);
  const [sourceFilter, setSourceFilter] = useState(ALL);
  const [filters, setFilters] = useState<RangeFilter[]>([]);
  const [pendingColumn, setPendingColumn] = useState<string>(NO_RANGE);
  const [frozen, setFrozen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const nextId = useRef(1);

  const captures = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => r.capture).filter((c): c is string => c !== null)),
      )
        .sort()
        .reverse(),
    [rows],
  );

  const queries = useMemo(
    () =>
      Array.from(
        new Set(
          rows.flatMap((r) =>
            (r.keywordTool?.foundVia ?? []).map((hit) => hit.query),
          ),
        ),
      ).sort(),
    [rows],
  );

  const boundFilters = filters.filter(
    (f) => f.min.trim() !== "" || f.max.trim() !== "",
  );

  const { visible, rangeIsCause } = useMemo(() => {
    const needle = keywordFilter.trim().toLowerCase();
    const source = SOURCE_FILTERS.find((s) => s.key === sourceFilter);

    const withoutRange = rows.filter((row) => {
      if (needle && !row.keyword.toLowerCase().includes(needle)) return false;
      if (captureFilter !== ALL && row.capture !== captureFilter) return false;
      if (
        queryFilter !== ALL &&
        !(row.keywordTool?.foundVia ?? []).some((hit) => hit.query === queryFilter)
      ) {
        return false;
      }
      if (source && !source.has(row)) return false;
      return true;
    });

    // Every bound filter must pass: they narrow together rather than
    // replacing one another.
    const filtered = withoutRange.filter((row) =>
      filters.every((f) => {
        const column = COLUMNS.find((c) => c.key === f.key);
        if (!column?.value) return true;
        const min = f.min.trim() === "" ? null : Number(f.min);
        const max = f.max.trim() === "" ? null : Number(f.max);
        return passesRange(column.value(row), min, max);
      }),
    );

    const compare = (
      a: KeywordTableRow,
      b: KeywordTableRow,
      sort: SortKey,
    ): number => {
      const column = COLUMNS.find((c) => c.key === sort.key);
      if (!column) return 0;
      if (column.value) {
        const av = column.value(a);
        const bv = column.value(b);
        // Blank sorts last in BOTH directions and at EVERY key position —
        // never as the lowest possible number, which is what a fabricated 0
        // would do.
        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;
        if (av === bv) return 0;
        return sort.direction === "asc" ? av - bv : bv - av;
      }
      if (column.sortNumber) {
        const av = column.sortNumber(a);
        const bv = column.sortNumber(b);
        if (av === bv) return 0;
        return sort.direction === "asc" ? av - bv : bv - av;
      }
      const left = column.text ? column.text(a) : a.keyword;
      const right = column.text ? column.text(b) : b.keyword;
      if (left === right) return 0;
      const order = left.localeCompare(right);
      return sort.direction === "asc" ? order : -order;
    };

    const sorted = [...filtered].sort((a, b) => {
      for (const sort of sorts) {
        const order = compare(a, b, sort);
        if (order !== 0) return order;
      }
      return a.keyword.localeCompare(b.keyword);
    });

    return {
      visible: sorted,
      rangeIsCause:
        boundFilters.length > 0 &&
        withoutRange.length > 0 &&
        filtered.length === 0,
    };
  }, [
    rows,
    keywordFilter,
    captureFilter,
    queryFilter,
    sourceFilter,
    filters,
    boundFilters.length,
    sorts,
  ]);

  /**
   * Clicking a column makes it the PRIMARY key and demotes the previous
   * primary to the tie-breaker; clicking the current primary cycles it
   * desc -> asc -> removed.
   *
   * Prepending rather than appending matters: appending meant a single click
   * on Ranked left the table still sorted by Searches, with Ranked only
   * breaking ties — which looks broken, because the column you just clicked
   * visibly does not order the table. Only two keys are kept; a third is
   * unreadable in the control.
   */
  function toggleSort(key: string) {
    setSorts((current) => {
      const index = current.findIndex((s) => s.key === key);
      if (index !== 0) {
        const rest = current.filter((s) => s.key !== key);
        return [{ key, direction: "desc" as Direction }, ...rest].slice(0, 2);
      }
      const next = [...current];
      if (next[0].direction === "desc") {
        next[0] = { key, direction: "asc" };
        return next;
      }
      next.shift();
      return next;
    });
  }

  function addFilter(key: string) {
    if (key === NO_RANGE) return;
    setFilters((f) => [...f, { id: nextId.current++, key, min: "", max: "" }]);
    setPendingColumn(NO_RANGE);
  }

  function updateFilter(id: number, patch: Partial<RangeFilter>) {
    setFilters((f) => f.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function removeFilter(id: number) {
    setFilters((f) => f.filter((x) => x.id !== id));
  }

  function exportCsv() {
    const blob = new Blob([buildCsv(visible)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `keyword-explorer-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Scrolls a band into view. Never hides the others — a jump that hid
   *  columns would be a column picker wearing a different name. */
  function jumpTo(group: GroupKey) {
    const container = scrollRef.current;
    const target = container?.querySelector<HTMLElement>(
      `[data-band="${group}"]`,
    );
    if (!container || !target) return;
    container.scrollTo({
      left: Math.max(target.offsetLeft - 16, 0),
      behavior: "smooth",
    });
  }

  const sortLabel =
    sorts.length === 0
      ? "none"
      : sorts
          .map((s) => {
            const c = COLUMNS.find((x) => x.key === s.key);
            return `${c ? c.label : s.key} ${s.direction === "asc" ? "↑" : "↓"}`;
          })
          .join(", then ");

  return (
    <div className="flex flex-col gap-4">
      {/* Row 1 — narrowing, ordering, and getting the data out. */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={keywordFilter}
          onChange={(e) => setKeywordFilter(e.target.value)}
          placeholder="Filter keywords"
          aria-label="Filter keywords"
          className="h-9 w-56 rounded-md border border-border bg-background-primary px-3 text-sm text-text-primary placeholder:text-text-muted"
        />

        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger size="sm" className="w-44" aria-label="Source">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All sources</SelectItem>
            {SOURCE_FILTERS.map((s) => (
              <SelectItem key={s.key} value={s.key}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={captureFilter} onValueChange={setCaptureFilter}>
          <SelectTrigger size="sm" className="w-40" aria-label="Capture">
            <SelectValue placeholder="Capture" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All captures</SelectItem>
            {captures.map((capture) => (
              <SelectItem key={capture} value={capture}>
                {capture}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={queryFilter} onValueChange={setQueryFilter}>
          <SelectTrigger size="sm" className="w-52" aria-label="Found via">
            <SelectValue placeholder="Found via" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All queries</SelectItem>
            {queries.map((query) => (
              <SelectItem key={query} value={query}>
                {query}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={pendingColumn} onValueChange={addFilter}>
          <SelectTrigger size="sm" className="w-52" aria-label="Add range filter">
            <SelectValue placeholder="+ Add filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_RANGE}>+ Add filter</SelectItem>
            {RANGE_COLUMNS.map((col) => (
              <SelectItem key={col.key} value={col.key}>
                {qualified(col)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button
          type="button"
          onClick={exportCsv}
          className="h-9 rounded-md border border-border bg-background-secondary px-3 text-sm text-text-primary transition-colors hover:text-text-secondary"
        >
          ⭳ Export CSV
        </button>

        <span className="ml-auto text-sm text-text-muted">
          {visible.length} of {rows.length}
          <span className="ml-3">Sort: {sortLabel}</span>
        </span>
      </div>

      {/* Active filters. Each stays visible and individually removable —
          adding one never clears another. */}
      {filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((f) => {
            const column = COLUMNS.find((c) => c.key === f.key);
            return (
              <span
                key={f.id}
                className="flex items-center gap-2 rounded-md border border-border bg-background-secondary px-2 py-1 text-xs text-text-primary"
              >
                <span className="text-text-secondary">
                  {column ? qualified(column) : f.key}
                </span>
                <input
                  type="number"
                  inputMode={f.key === "kt.ratio" ? "decimal" : "numeric"}
                  value={f.min}
                  onChange={(e) => updateFilter(f.id, { min: e.target.value })}
                  placeholder="Min"
                  aria-label={`${column ? qualified(column) : f.key} minimum`}
                  className="h-7 w-16 rounded border border-border bg-background-primary px-1 text-xs text-text-primary placeholder:text-text-muted"
                />
                <span className="text-text-muted" aria-hidden>
                  –
                </span>
                <input
                  type="number"
                  inputMode={f.key === "kt.ratio" ? "decimal" : "numeric"}
                  value={f.max}
                  onChange={(e) => updateFilter(f.id, { max: e.target.value })}
                  placeholder="Max"
                  aria-label={`${column ? qualified(column) : f.key} maximum`}
                  className="h-7 w-16 rounded border border-border bg-background-primary px-1 text-xs text-text-primary placeholder:text-text-muted"
                />
                <button
                  type="button"
                  onClick={() => removeFilter(f.id)}
                  aria-label={`Remove ${column ? qualified(column) : f.key} filter`}
                  className="text-text-muted transition-colors hover:text-text-primary"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Row 2 — moving around a table that is wider than the screen. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-text-muted">Jump to band</span>
        {GROUPS.filter((g) => g.label).map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => jumpTo(g.key)}
            className="rounded-md border border-border bg-background-secondary px-2 py-1 text-xs text-text-primary transition-colors hover:text-text-secondary"
          >
            {g.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setFrozen((v) => !v)}
          aria-pressed={frozen}
          className={`ml-auto rounded-md border px-2 py-1 text-xs transition-colors ${
            frozen
              ? "border-accent-primary bg-accent-primary/20 text-text-secondary"
              : "border-border bg-background-secondary text-text-primary"
          }`}
        >
          ❄ Freeze keyword · {frozen ? "on" : "off"}
        </button>
      </div>

      {/*
        The scrollbar is forced visible rather than left to the platform:
        macOS overlay bars fade out, so a 3,000px table looks exactly like a
        1,000px one at rest and gives no sign that 20 more columns exist. The
        thumb's width is the only honest indicator of how much is off-screen.
      */}
      <div
        ref={scrollRef}
        className="overflow-x-scroll [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-accent-primary/60 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-accent-primary/10"
      >
        <table className="w-auto min-w-full border-collapse text-sm">
          <thead>
            <tr>
              {GROUPS.map((group) => {
                const span = COLUMNS.filter((c) => c.group === group.key).length;
                if (span === 0) return null;
                return (
                  <th
                    key={group.key}
                    data-band={group.key}
                    scope="colgroup"
                    colSpan={span}
                    className="whitespace-nowrap px-3 pb-1 pt-2 text-left text-[11px] font-medium uppercase tracking-wide text-text-secondary"
                  >
                    {group.label ? (
                      <span className="block border-b-2 border-accent-primary/50 pb-1">
                        {group.label}
                        {group.window && (
                          <span className="ml-2 normal-case text-text-muted">
                            ({group.window})
                          </span>
                        )}
                      </span>
                    ) : null}
                  </th>
                );
              })}
            </tr>
            <tr className="border-b border-border">
              {COLUMNS.map((column, index) => {
                const sort = sorts.find((s) => s.key === column.key);
                const rank = sorts.findIndex((s) => s.key === column.key);
                const sticky =
                  frozen && index === 0
                    ? "sticky left-0 z-20 bg-background-primary"
                    : "";
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      sort
                        ? sort.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    className={`w-[1%] whitespace-nowrap px-3 py-2 font-normal ${sticky} ${
                      column.numeric ? "text-right" : "text-left"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className="whitespace-nowrap text-text-secondary transition-colors hover:text-text-primary"
                    >
                      {column.label}
                      <span aria-hidden className="ml-1 text-text-muted">
                        {sort ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}
                        {sorts.length > 1 && rank !== -1 ? rank + 1 : ""}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.keyword} className="border-b border-border">
                {COLUMNS.map((column, index) => (
                  <td
                    key={column.key}
                    className={`w-[1%] whitespace-nowrap px-3 py-2 text-text-primary ${
                      frozen && index === 0
                        ? "sticky left-0 z-10 bg-background-primary"
                        : ""
                    } ${column.numeric ? "text-right" : "text-left"}`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {visible.length === 0 && (
          <p className="px-3 py-6 text-sm text-text-muted">
            {!rangeIsCause ? (
              <>
                No rows match these filters. The archive is hand-filtered at
                capture time, so a keyword you expected may simply never have
                been exported — that is unexplained, not evidence it lost
                demand.
              </>
            ) : (
              <>No rows fall within these ranges. Widen or remove one to see more.</>
            )}
          </p>
        )}
      </div>

      <p className="text-xs text-text-muted">
        “&lt; N” means eRank capped the value rather than reporting it exactly;
        a dash means it was never scored at all, or that this source has no row
        for the keyword. Neither is 0. Shop counts <em>visits</em> (people who
        arrived) and Etsy Ads counts <em>views</em> (impressions) over
        different windows — they are never summed.
      </p>
    </div>
  );
}
