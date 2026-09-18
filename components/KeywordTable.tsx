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
import { demandRatio, totalTagOccurrences } from "@/lib/keyword-corpus";

type SortKey =
  | "keyword"
  | "searches"
  | "competition"
  | "kd"
  | "ranked"
  | "targeting"
  | "tagOccurrences"
  | "ratio";

/** The numeric columns a range filter can target. A subset of SortKey. */
type RangeKey =
  | "searches"
  | "competition"
  | "kd"
  | "ranked"
  | "targeting"
  | "ratio";

type Direction = "asc" | "desc";

const ALL = "__all__";
const NO_RANGE = "__none__";

/**
 * Column definitions.
 *
 * `grow` marks the one column that absorbs surplus width. Every other column
 * is measured to its own widest value via `w-[1%]` + `whitespace-nowrap`,
 * which is the CSS equivalent of what the Figma rounds do with hug-content
 * frames: the browser does the measuring.
 *
 * Status, Capture and Coverage are deliberately absent — hidden from the
 * table per Katy, 2026-09-18 ("don't delete that data but I don't really
 * need to see it in the main table"). The fields still exist on every row;
 * nothing here reads or discards them.
 */
const COLUMNS: {
  key: SortKey;
  label: string;
  numeric?: boolean;
  grow?: boolean;
}[] = [
  { key: "keyword", label: "Keyword", grow: true },
  { key: "searches", label: "Searches", numeric: true },
  { key: "competition", label: "Competition", numeric: true },
  { key: "kd", label: "KD", numeric: true },
  { key: "ranked", label: "Ranked", numeric: true },
  { key: "targeting", label: "Targeting", numeric: true },
  { key: "tagOccurrences", label: "Found via (query)" },
  { key: "ratio", label: "Searches / comp.", numeric: true },
];

const RANGE_COLUMNS: { key: RangeKey; label: string }[] = [
  { key: "searches", label: "Searches" },
  { key: "competition", label: "Competition" },
  { key: "kd", label: "KD" },
  { key: "ranked", label: "Ranked" },
  { key: "targeting", label: "Targeting" },
  { key: "ratio", label: "Searches / comp." },
];

/** `null` for Ranked/Targeting means no observed match — never `0`. */
function rangeValue(row: KeywordTableRow, key: RangeKey): number | null {
  switch (key) {
    case "searches":
      return row.searches;
    case "competition":
      return row.competition;
    case "kd":
      return row.kd;
    case "ranked":
      return row.ranked;
    case "targeting":
      return row.targeting;
    case "ratio":
      return demandRatio(row);
  }
}

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

function sortValue(row: KeywordTableRow, key: SortKey): string | number {
  switch (key) {
    case "keyword":
      return row.keyword;
    case "searches":
      return row.searches;
    case "competition":
      return row.competition;
    case "kd":
      return row.kd;
    case "tagOccurrences":
      return totalTagOccurrences(row);
    case "ratio":
      return demandRatio(row) ?? -1;
    case "ranked":
    case "targeting":
      // Handled separately in the sort comparator — blank always sorts last,
      // in both directions, rather than as the lowest possible number.
      return 0;
  }
}

function formatRatio(row: KeywordTableRow): string {
  const ratio = demandRatio(row);
  if (ratio === null) return "—";
  return ratio.toFixed(3);
}

interface KeywordTableProps {
  rows: KeywordTableRow[];
}

export default function KeywordTable({ rows }: KeywordTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("searches");
  const [direction, setDirection] = useState<Direction>("desc");
  const [keywordFilter, setKeywordFilter] = useState("");
  const [captureFilter, setCaptureFilter] = useState(ALL);
  const [queryFilter, setQueryFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [rangeColumn, setRangeColumn] = useState<RangeKey | typeof NO_RANGE>(
    NO_RANGE,
  );
  const [rangeMin, setRangeMin] = useState("");
  const [rangeMax, setRangeMax] = useState("");

  const captures = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.capture)))
        .sort()
        .reverse(),
    [rows],
  );

  const queries = useMemo(
    () =>
      Array.from(
        new Set(rows.flatMap((r) => r.foundVia.map((hit) => hit.query))),
      ).sort(),
    [rows],
  );

  const visible = useMemo(() => {
    const needle = keywordFilter.trim().toLowerCase();
    const min = rangeMin.trim() === "" ? null : Number(rangeMin);
    const max = rangeMax.trim() === "" ? null : Number(rangeMax);

    const filtered = rows.filter((row) => {
      if (needle && !row.keyword.toLowerCase().includes(needle)) return false;
      if (captureFilter !== ALL && row.capture !== captureFilter) return false;
      if (
        queryFilter !== ALL &&
        !row.foundVia.some((hit) => hit.query === queryFilter)
      ) {
        return false;
      }
      if (statusFilter === "current" && !row.current) return false;
      if (statusFilter === "superseded" && row.current) return false;
      if (rangeColumn !== NO_RANGE) {
        const value = rangeValue(row, rangeColumn);
        if (!passesRange(value, min, max)) return false;
      }
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === "ranked" || sortKey === "targeting") {
        const av = sortKey === "ranked" ? a.ranked : a.targeting;
        const bv = sortKey === "ranked" ? b.ranked : b.targeting;
        if (av === null && bv === null)
          return a.keyword.localeCompare(b.keyword);
        if (av === null) return 1;
        if (bv === null) return -1;
        const order = av - bv;
        return direction === "asc" ? order : -order;
      }

      const left = sortValue(a, sortKey);
      const right = sortValue(b, sortKey);
      if (left === right) return a.keyword.localeCompare(b.keyword);
      const order =
        typeof left === "string" && typeof right === "string"
          ? left.localeCompare(right)
          : Number(left) - Number(right);
      return direction === "asc" ? order : -order;
    });

    return sorted;
  }, [
    rows,
    keywordFilter,
    captureFilter,
    queryFilter,
    statusFilter,
    rangeColumn,
    rangeMin,
    rangeMax,
    sortKey,
    direction,
  ]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDirection(key === "keyword" ? "asc" : "desc");
    }
  }

  function formatTraction(value: number | null): string {
    return value === null ? "—" : value.toLocaleString();
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

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger size="sm" className="w-40" aria-label="Status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            <SelectItem value="current">Current</SelectItem>
            <SelectItem value="superseded">Superseded</SelectItem>
          </SelectContent>
        </Select>

        {/* Range filter: one active numeric column at a time (design.md §
            Decisions) — a picker plus two plain number inputs, matching the
            keyword filter's un-wrapped <input> rather than a new pattern. */}
        <Select
          value={rangeColumn}
          onValueChange={(value) =>
            setRangeColumn(value === NO_RANGE ? NO_RANGE : (value as RangeKey))
          }
        >
          <SelectTrigger
            size="sm"
            className="w-44"
            aria-label="Range filter column"
          >
            <SelectValue placeholder="Range filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_RANGE}>No range filter</SelectItem>
            {RANGE_COLUMNS.map((col) => (
              <SelectItem key={col.key} value={col.key}>
                {col.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {rangeColumn !== NO_RANGE && (
          <>
            {/* Searches/comp. is the one fractional column (demandRatio
                returns e.g. 1.522) — a plain numeric keypad on mobile has no
                decimal separator, so it switches to decimal for that column
                only. Every other range target is a whole number. */}
            <input
              type="number"
              inputMode={rangeColumn === "ratio" ? "decimal" : "numeric"}
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
              inputMode={rangeColumn === "ratio" ? "decimal" : "numeric"}
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
              <tr
                key={`${row.keyword}-${row.capture}`}
                className="border-b border-border"
              >
                <td className="w-full whitespace-nowrap px-3 py-2 text-text-primary">
                  {row.keyword}
                </td>
                <td className="w-[1%] whitespace-nowrap px-3 py-2 text-right text-text-primary">
                  {row.searches.toLocaleString()}
                </td>
                <td className="w-[1%] whitespace-nowrap px-3 py-2 text-right text-text-primary">
                  {row.competition.toLocaleString()}
                </td>
                <td className="w-[1%] whitespace-nowrap px-3 py-2 text-right text-text-primary">
                  {row.kd}
                </td>
                {/* Best (lowest) position across every ranking listing; blank,
                    never 0, when there is no Spotted on Etsy match. */}
                <td className="w-[1%] whitespace-nowrap px-3 py-2 text-right text-text-primary">
                  {formatTraction(row.ranked)}
                </td>
                {/* Lowest matching tag slot (1–13) across every current
                    listing; blank, never 0, when untargeted. */}
                <td className="w-[1%] whitespace-nowrap px-3 py-2 text-right text-text-primary">
                  {formatTraction(row.targeting)}
                </td>
                {/* Tag occurrences stay per query. `embroidery font` read 6,
                    81, 80 and 12 under four queries on one day; one merged
                    number would be invented. */}
                <td className="w-[1%] whitespace-nowrap px-3 py-2 text-text-primary">
                  {row.foundVia
                    .map((hit) => `${hit.query} (${hit.tagOccurrences})`)
                    .join(", ")}
                </td>
                <td className="w-[1%] whitespace-nowrap px-3 py-2 text-right text-text-primary">
                  {formatRatio(row)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {visible.length === 0 && (
          <p className="px-3 py-6 text-sm text-text-muted">
            No rows match these filters. The archive is hand-filtered at capture
            time, so a keyword you expected may simply never have been exported
            — that is unexplained, not evidence it lost demand.
          </p>
        )}
      </div>
    </div>
  );
}
