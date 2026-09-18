"use client";

import { useMemo, useState } from "react";
import { Badge } from "@beckharrisdesign/mvds";
import type { BulkKeywordRow } from "@/types";
import { bulkValueLabel } from "@/lib/keyword-corpus";

type SortKey =
  | "keyword"
  | "avgSearches"
  | "avgClicks"
  | "avgCtr"
  | "etsyCompetition"
  | "kd"
  | "status";

type Direction = "asc" | "desc";

const COLUMNS: {
  key: SortKey;
  label: string;
  numeric?: boolean;
  grow?: boolean;
}[] = [
  { key: "keyword", label: "Keyword", grow: true },
  { key: "avgSearches", label: "Avg searches", numeric: true },
  { key: "avgClicks", label: "Avg clicks", numeric: true },
  { key: "avgCtr", label: "Avg CTR", numeric: true },
  { key: "etsyCompetition", label: "Etsy competition", numeric: true },
  { key: "kd", label: "KD", numeric: true },
  { key: "status", label: "Status" },
];

/** Numeric sort value for a possibly-null field. `null` always sorts last,
 * in either direction — never treated as 0, which would read as "no
 * demand" for a term eRank simply never scored. */
function numericSortValue(value: number | null, direction: Direction): number {
  if (value === null) return direction === "asc" ? Infinity : -Infinity;
  return value;
}

function sortValue(
  row: BulkKeywordRow,
  key: SortKey,
  direction: Direction,
): string | number {
  switch (key) {
    case "keyword":
      return row.keyword;
    case "avgSearches":
      return numericSortValue(row.avgSearches, direction);
    case "avgClicks":
      return numericSortValue(row.avgClicks, direction);
    case "avgCtr":
      return numericSortValue(row.avgCtr, direction);
    case "etsyCompetition":
      return numericSortValue(row.etsyCompetition, direction);
    case "kd":
      return numericSortValue(row.kd, direction);
    case "status":
      return row.current ? 0 : 1;
  }
}

export default function BulkKeywordTable({ rows }: { rows: BulkKeywordRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("avgSearches");
  const [direction, setDirection] = useState<Direction>("desc");
  const [keywordFilter, setKeywordFilter] = useState("");

  const visible = useMemo(() => {
    const needle = keywordFilter.trim().toLowerCase();
    const filtered = needle
      ? rows.filter((row) => row.keyword.toLowerCase().includes(needle))
      : rows;

    return [...filtered].sort((a, b) => {
      const left = sortValue(a, sortKey, direction);
      const right = sortValue(b, sortKey, direction);
      if (left === right) return a.keyword.localeCompare(b.keyword);
      const order =
        typeof left === "string" && typeof right === "string"
          ? left.localeCompare(right)
          : Number(left) - Number(right);
      return direction === "asc" ? order : -order;
    });
  }, [rows, keywordFilter, sortKey, direction]);

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
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={keywordFilter}
          onChange={(e) => setKeywordFilter(e.target.value)}
          placeholder="Filter keywords"
          aria-label="Filter bulk keywords"
          className="h-9 w-56 rounded-md border border-border bg-background-primary px-3 text-sm text-text-primary placeholder:text-text-muted"
        />
        <span className="ml-auto text-sm text-text-muted">
          {visible.length} of {rows.length}
        </span>
      </div>

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
                  {bulkValueLabel(row.avgSearches, row.avgSearchesCensored)}
                </td>
                <td className="w-[1%] whitespace-nowrap px-3 py-2 text-right text-text-primary">
                  {bulkValueLabel(row.avgClicks, row.avgClicksCensored)}
                </td>
                <td className="w-[1%] whitespace-nowrap px-3 py-2 text-right text-text-primary">
                  {row.avgCtr === null
                    ? "—"
                    : `${row.avgCtrCensored ? "< " : ""}${row.avgCtr}%`}
                </td>
                <td className="w-[1%] whitespace-nowrap px-3 py-2 text-right text-text-primary">
                  {bulkValueLabel(row.etsyCompetition, false)}
                </td>
                <td className="w-[1%] whitespace-nowrap px-3 py-2 text-right text-text-primary">
                  {bulkValueLabel(row.kd, false)}
                </td>
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
            No rows match this filter.
          </p>
        )}
      </div>
    </div>
  );
}
