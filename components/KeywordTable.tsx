"use client";

import { useMemo, useState } from "react";
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
type GroupKey = "keyword" | "kt" | "bulk" | "tag" | "ranked" | "targeting";

const GROUPS: { key: GroupKey; label: string }[] = [
  { key: "keyword", label: "" },
  { key: "kt", label: "eRank Keyword Tool" },
  { key: "bulk", label: "eRank Bulk Keywords" },
  { key: "tag", label: "eRank Tag Report" },
  { key: "ranked", label: "Ranked" },
  { key: "targeting", label: "Targeting" },
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
  grow?: boolean;
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
    grow: true,
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
];

const RANGE_COLUMNS = COLUMNS.filter((c) => c.value);

const SOURCE_FILTERS: { key: string; label: string; has: (row: KeywordTableRow) => boolean }[] = [
  { key: "kt", label: "Keyword Tool", has: (r) => r.keywordTool !== null },
  { key: "bulk", label: "Bulk Keywords", has: (r) => r.bulkKeywords !== null },
  { key: "tag", label: "Tag Report", has: (r) => r.tagReport !== null },
  { key: "ranked", label: "Ranked", has: (r) => r.ranked !== null },
  { key: "targeting", label: "Targeting", has: (r) => r.targeting !== null },
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

interface KeywordTableProps {
  rows: KeywordTableRow[];
}

export default function KeywordTable({ rows }: KeywordTableProps) {
  const [sortKey, setSortKey] = useState("kt.searches");
  const [direction, setDirection] = useState<Direction>("desc");
  const [keywordFilter, setKeywordFilter] = useState("");
  const [captureFilter, setCaptureFilter] = useState(ALL);
  const [queryFilter, setQueryFilter] = useState(ALL);
  const [sourceFilter, setSourceFilter] = useState(ALL);
  const [rangeColumn, setRangeColumn] = useState<string>(NO_RANGE);
  const [rangeMin, setRangeMin] = useState("");
  const [rangeMax, setRangeMax] = useState("");

  // A range *column* being picked isn't itself an applied filter — only a
  // non-empty min or max actually narrows anything (see passesRange, which
  // treats both-blank as "no bound"). The empty-state copy below keys off
  // this, not off rangeColumn alone.
  const rangeBoundSet =
    rangeColumn !== NO_RANGE &&
    (rangeMin.trim() !== "" || rangeMax.trim() !== "");

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

  const activeColumn = useMemo(
    () => COLUMNS.find((c) => c.key === rangeColumn),
    [rangeColumn],
  );

  const { visible, rangeIsCause } = useMemo(() => {
    const needle = keywordFilter.trim().toLowerCase();
    const min = rangeMin.trim() === "" ? null : Number(rangeMin);
    const max = rangeMax.trim() === "" ? null : Number(rangeMax);
    const source = SOURCE_FILTERS.find((s) => s.key === sourceFilter);

    // Split out from the range check on purpose: comparing counts with and
    // without the range filter is how the empty-state message below tells
    // "the range emptied this" from "a keyword/capture/query/source filter
    // (or the archive itself) already had".
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

    const column = COLUMNS.find((c) => c.key === rangeColumn);
    const filtered =
      !column || !column.value
        ? withoutRange
        : withoutRange.filter((row) =>
            passesRange(column.value!(row), min, max),
          );

    const sortColumn = COLUMNS.find((c) => c.key === sortKey) ?? COLUMNS[0];
    const sorted = [...filtered].sort((a, b) => {
      if (sortColumn.value) {
        const av = sortColumn.value(a);
        const bv = sortColumn.value(b);
        // Blank sorts last in BOTH directions — never as the lowest possible
        // number, which is what a fabricated 0 would do.
        if (av === null && bv === null) return a.keyword.localeCompare(b.keyword);
        if (av === null) return 1;
        if (bv === null) return -1;
        if (av === bv) return a.keyword.localeCompare(b.keyword);
        return direction === "asc" ? av - bv : bv - av;
      }

      if (sortColumn.sortNumber) {
        const av = sortColumn.sortNumber(a);
        const bv = sortColumn.sortNumber(b);
        if (av === bv) return a.keyword.localeCompare(b.keyword);
        return direction === "asc" ? av - bv : bv - av;
      }

      const left = sortColumn.text ? sortColumn.text(a) : a.keyword;
      const right = sortColumn.text ? sortColumn.text(b) : b.keyword;
      if (left === right) return a.keyword.localeCompare(b.keyword);
      const order = left.localeCompare(right);
      return direction === "asc" ? order : -order;
    });

    return {
      visible: sorted,
      rangeIsCause:
        rangeBoundSet && withoutRange.length > 0 && filtered.length === 0,
    };
  }, [
    rows,
    keywordFilter,
    captureFilter,
    queryFilter,
    sourceFilter,
    rangeColumn,
    rangeMin,
    rangeMax,
    rangeBoundSet,
    sortKey,
    direction,
  ]);

  function toggleSort(key: string) {
    if (key === sortKey) {
      setDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDirection(key === "keyword" ? "asc" : "desc");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filter row. Reduction is sort and filter only — there is no second
          screen and no row detail view. */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={keywordFilter}
          onChange={(e) => setKeywordFilter(e.target.value)}
          placeholder="Filter keywords"
          aria-label="Filter keywords"
          className="h-9 w-56 rounded-md border border-border bg-background-primary px-3 text-sm text-text-primary placeholder:text-text-muted"
        />

        {/* With 258 of the archive's 287 Tag Report tags appearing in no other
            source, an unfiltered table is mostly blank by construction.
            Narrowing to one instrument is the cheapest way to make it dense on
            demand without hiding anything by default (design.md decision 4). */}
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
          <SelectTrigger size="sm" className="w-44" aria-label="Capture">
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
          <SelectTrigger size="sm" className="w-56" aria-label="Found via">
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

        {/* Range filter: one active numeric column at a time (design.md §
            Decisions) — a picker plus two plain number inputs. */}
        <Select
          value={rangeColumn}
          onValueChange={(value) => {
            setRangeColumn(value);
            // Bounds are per-column, not global: without this, switching from
            // Ranked >= 10 straight to Targeting would silently keep applying
            // >= 10 to Targeting, a filter Katy never set on it.
            setRangeMin("");
            setRangeMax("");
          }}
        >
          <SelectTrigger
            size="sm"
            className="w-56"
            aria-label="Range filter column"
          >
            <SelectValue placeholder="Range filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_RANGE}>No range filter</SelectItem>
            {RANGE_COLUMNS.map((col) => {
              const group = GROUPS.find((g) => g.key === col.group);
              // The picker is a flat list with no band above it, so here the
              // source has to be spelled out — the same collision the table
              // solves with a band solves nothing in a dropdown.
              return (
                <SelectItem key={col.key} value={col.key}>
                  {group?.label ? `${group.label} — ${col.label}` : col.label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {rangeColumn !== NO_RANGE && (
          <>
            {/* S / comp. is the one fractional column (demandRatio returns
                e.g. 1.522) — a plain numeric keypad on mobile has no decimal
                separator, so it switches to decimal for that column only. */}
            <input
              type="number"
              inputMode={rangeColumn === "kt.ratio" ? "decimal" : "numeric"}
              value={rangeMin}
              onChange={(e) => setRangeMin(e.target.value)}
              placeholder="Min"
              aria-label="Range filter minimum"
              className="h-9 w-20 rounded-md border border-border bg-background-primary px-2 text-sm text-text-primary placeholder:text-text-muted"
            />
            <span className="text-text-muted" aria-hidden>
              –
            </span>
            <input
              type="number"
              inputMode={rangeColumn === "kt.ratio" ? "decimal" : "numeric"}
              value={rangeMax}
              onChange={(e) => setRangeMax(e.target.value)}
              placeholder="Max"
              aria-label="Range filter maximum"
              className="h-9 w-20 rounded-md border border-border bg-background-primary px-2 text-sm text-text-primary placeholder:text-text-muted"
            />
          </>
        )}

        <span className="ml-auto text-sm text-text-muted">
          {visible.length} of {rows.length}
        </span>
      </div>

      {/* One scrolling surface. At 480 the table scrolls horizontally rather
          than reflowing into cards — reflowing would break the nowrap rule and
          make scanning worse, which is the thing a table is for. */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {GROUPS.map((group) => {
                const span = COLUMNS.filter((c) => c.group === group.key).length;
                if (span === 0) return null;
                return (
                  <th
                    key={group.key}
                    scope="colgroup"
                    colSpan={span}
                    className="whitespace-nowrap px-3 pb-1 pt-2 text-left text-[11px] font-medium uppercase tracking-wide text-text-secondary"
                  >
                    {group.label ? (
                      <span className="block border-b-2 border-accent-primary/50 pb-1">
                        {group.label}
                      </span>
                    ) : null}
                  </th>
                );
              })}
            </tr>
            <tr className="border-b border-border">
              {COLUMNS.map((column) => {
                const active = sortKey === column.key;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      active
                        ? direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    className={`${column.grow ? "w-full" : "w-[1%]"} whitespace-nowrap px-3 py-2 font-normal ${
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
                        {active ? (direction === "asc" ? "↑" : "↓") : "↕"}
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
                {COLUMNS.map((column) => (
                  <td
                    key={column.key}
                    className={`${column.grow ? "w-full" : "w-[1%]"} whitespace-nowrap px-3 py-2 text-text-primary ${
                      column.numeric ? "text-right" : "text-left"
                    }`}
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
              <>
                No rows fall within this range. Widen or clear it to see more.
              </>
            )}
          </p>
        )}
      </div>

      {/* One note, covering all three censored sources. It used to live in the
          Bulk Keywords section's own paragraph, back when Bulk Keywords was
          the only instrument that censored (design.md decision 3). */}
      <p className="text-xs text-text-muted">
        “&lt; N” means eRank capped the value rather than reporting it exactly;
        a dash means it was never scored at all, or that this source has no row
        for the keyword. Neither is 0.
      </p>
    </div>
  );
}
