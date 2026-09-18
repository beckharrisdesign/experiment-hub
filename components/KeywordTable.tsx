"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@beckharrisdesign/mvds";
import type { KeywordRow } from "@/types";
import {
  coverageLabel,
  demandRatio,
  totalTagOccurrences,
} from "@/lib/keyword-corpus";

type SortKey =
  | "keyword"
  | "searches"
  | "competition"
  | "kd"
  | "tagOccurrences"
  | "ratio"
  | "coverage"
  | "capture"
  | "status";

type Direction = "asc" | "desc";

const ALL = "__all__";

/**
 * Column definitions.
 *
 * `grow` marks the one column that absorbs surplus width. Every other column
 * is measured to its own widest value via `w-[1%]` + `whitespace-nowrap`,
 * which is the CSS equivalent of what the Figma rounds do with hug-content
 * frames: the browser does the measuring.
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
  { key: "tagOccurrences", label: "Found via (query)" },
  { key: "ratio", label: "Searches / comp.", numeric: true },
  { key: "coverage", label: "Coverage" },
  { key: "capture", label: "Capture" },
  { key: "status", label: "Status" },
];

function sortValue(row: KeywordRow, key: SortKey): string | number {
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
    case "coverage":
      return row.coverage.of ? row.coverage.seen / row.coverage.of : 0;
    case "capture":
      return row.capture;
    case "status":
      return row.current ? 0 : 1;
  }
}

function formatRatio(row: KeywordRow): string {
  const ratio = demandRatio(row);
  if (ratio === null) return "—";
  return ratio.toFixed(3);
}

export default function KeywordTable({ rows }: { rows: KeywordRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("searches");
  const [direction, setDirection] = useState<Direction>("desc");
  const [keywordFilter, setKeywordFilter] = useState("");
  const [captureFilter, setCaptureFilter] = useState(ALL);
  const [queryFilter, setQueryFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);

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
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
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
                <td className="w-[1%] whitespace-nowrap px-3 py-2 text-text-primary">
                  {coverageLabel(row)}
                </td>
                <td className="w-[1%] whitespace-nowrap px-3 py-2 text-text-primary">
                  {row.capture}
                </td>
                {/* Status reads, it does not glow. The proposal's colour-band
                    schema is recorded and deliberately unapplied, so both
                    states use one neutral variant and the word carries the
                    meaning. */}
                <td className="w-[1%] whitespace-nowrap px-3 py-2">
                  <Badge variant="outline">
                    {row.current
                      ? "current"
                      : `superseded${row.supersededBy ? ` → ${row.supersededBy}` : ""}`}
                  </Badge>
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
