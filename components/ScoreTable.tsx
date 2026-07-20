"use client";

import { useMemo, useState, type ReactNode } from "react";
import Tooltip from "@/components/Tooltip";

/**
 * The hub's shared sortable table.
 *
 * Extracted from the inline table in `app/page-client.tsx` so the home page and
 * the Etsy listing scorecard render the *same* table rather than two lookalikes
 * (openspec/changes/etsy-zero-sales-funnel, design decision 7).
 *
 * What is shared: the dark-green header, the sort interaction and caret, the
 * row chrome, and the score-pill colour thresholds. What is NOT shared: the
 * cells themselves — callers supply a `render` per column, so this component
 * knows nothing about experiments or listings.
 */

export type ColumnAlign = "left" | "center";

export interface ScoreTableColumn<T> {
  /** Stable key; also the sort key when `sortable` is set. */
  key: string;
  header: ReactNode;
  /** Tooltip on the header cell. */
  headerTooltip?: string;
  align?: ColumnAlign;
  /** Narrow, non-wrapping column (the ✓/— style columns). */
  compact?: boolean;
  /**
   * Return a comparable value to enable sorting on this column. Omit to make
   * the column unsortable.
   */
  sortValue?: (row: T) => string | number | null | undefined;
  render: (row: T) => ReactNode;
}

export interface ScoreTableProps<T> {
  rows: T[];
  columns: ScoreTableColumn<T>[];
  rowKey: (row: T) => string | number;
  /** Column key to sort by initially. Omit to preserve the given order. */
  defaultSortKey?: string;
  defaultSortDirection?: SortDirection;
  /**
   * Rendered instead of the table when `rows` is empty. The hub convention is
   * a bordered panel with muted text.
   */
  emptyMessage?: ReactNode;
  /** Extra classes on a row, e.g. to mute drafts. */
  rowClassName?: (row: T) => string | undefined;
}

export type SortDirection = "asc" | "desc";

// ---------------------------------------------------------------------------
// Score pill — shared threshold treatment (green → yellow → orange → red)
// ---------------------------------------------------------------------------

/**
 * Colour classes for a 0-100 score pill. Kept here so the home page's /25
 * badge and the scorecard's completeness % use one scale; callers normalise
 * to a percentage first.
 */
export function getScorePillColor(percent: number): string {
  if (percent >= 70) return "bg-green-600 border-green-700 text-white";
  if (percent >= 50) return "bg-yellow-500 border-yellow-600 text-white";
  if (percent >= 35) return "bg-orange-500 border-orange-600 text-white";
  return "bg-red-500 border-red-600 text-white";
}

// ---------------------------------------------------------------------------

const HEADER_BASE =
  "px-4 py-4 text-left text-base font-medium text-text-primary transition-colors";
const HEADER_COMPACT =
  "w-px whitespace-nowrap px-2 py-4 text-center text-base font-medium text-text-primary border-l border-[rgba(20,174,92,0.3)] transition-colors";
const CELL_BASE = "px-4 py-3";
const CELL_COMPACT =
  "w-px whitespace-nowrap px-2 py-3 text-center border-l border-[rgba(20,174,92,0.2)]";

export default function ScoreTable<T>({
  rows,
  columns,
  rowKey,
  defaultSortKey,
  defaultSortDirection = "desc",
  emptyMessage,
  rowClassName,
}: ScoreTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(
    defaultSortKey ?? null,
  );
  const [sortDirection, setSortDirection] =
    useState<SortDirection>(defaultSortDirection);

  const handleSort = (column: ScoreTableColumn<T>) => {
    if (!column.sortValue) return;
    if (sortColumn === column.key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column.key);
      setSortDirection("desc");
    }
  };

  const sortedRows = useMemo(() => {
    const active = columns.find((c) => c.key === sortColumn && c.sortValue);
    // No active sort column means the caller's order is authoritative — the
    // scorecard relies on this to hand us a pre-ranked list.
    if (!active?.sortValue) return rows;

    const valueOf = active.sortValue;
    return [...rows].sort((a, b) => {
      const av = valueOf(a) ?? "";
      const bv = valueOf(b) ?? "";
      if (av < bv) return sortDirection === "asc" ? -1 : 1;
      if (av > bv) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, columns, sortColumn, sortDirection]);

  if (rows.length === 0 && emptyMessage) {
    return (
      <div className="border border-border-dark rounded p-8 text-center">
        <p className="text-sm text-text-dark-secondary">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-[#194b31]">
      <table className="w-full">
        <thead>
          <tr className="bg-[#194b31]">
            {columns.map((column) => {
              const sortable = !!column.sortValue;
              const label = (
                <div
                  className={`flex items-center gap-1 ${
                    column.align === "center" || column.compact
                      ? "justify-center"
                      : ""
                  }`}
                >
                  <span className={sortable ? undefined : "cursor-help"}>
                    {column.header}
                  </span>
                  {sortColumn === column.key && sortable && (
                    <span className="text-accent-primary">
                      {sortDirection === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              );

              return (
                <th
                  key={column.key}
                  scope="col"
                  className={`${column.compact ? HEADER_COMPACT : HEADER_BASE} ${
                    sortable
                      ? "cursor-pointer hover:bg-background-secondary"
                      : ""
                  }`}
                  onClick={sortable ? () => handleSort(column) : undefined}
                  aria-sort={
                    sortColumn === column.key && sortable
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  {column.headerTooltip ? (
                    <Tooltip content={column.headerTooltip} position="bottom">
                      {label}
                    </Tooltip>
                  ) : (
                    label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr
              key={rowKey(row)}
              className={`border-t border-[rgba(20,174,92,0.2)] bg-[rgba(255,255,255,0.2)] hover:bg-[rgba(20,174,92,0.04)] transition-colors ${
                rowClassName?.(row) ?? ""
              }`}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={column.compact ? CELL_COMPACT : CELL_BASE}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
