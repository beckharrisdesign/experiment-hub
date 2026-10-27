"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Inline } from "@beckharrisdesign/mvds";
import { paths } from "../../lib/estate-sale-planner/routes";
import type { HistoryEntry } from "../../lib/estate-sale-planner/storage";
import { formatTally } from "../../lib/estate-sale-planner/tally";

interface SaleListProps {
  entries: HistoryEntry[];
  onDelete: (id: string) => void;
}

/** A sale's state in a word or two, from its counts. The real lifecycle (listed, closed, sold) is 05b. */
export function saleStatus(e: HistoryEntry): { label: string; variant: "default" | "muted" | "success" } {
  if (e.items === 0) return { label: "Empty", variant: "muted" };
  if (e.undecided > 0) return { label: `${e.undecided} to sort`, variant: "default" };
  return { label: "Sorted", variant: "success" };
}

/** The three piles, in the order the sale screen shows them. Grid positions are spelled out so
 * Tailwind sees every class: on a phone the tallies sit in a row under the name; from `md` up
 * the whole sale is one line under a shared header. */
const PILES = [
  { key: "sell", label: "Possible sale", cell: "col-start-1 row-start-2 md:col-start-2 md:row-start-1" },
  { key: "donate", label: "Possible donation", cell: "col-start-2 row-start-2 md:col-start-3 md:row-start-1" },
  { key: "keep", label: "Possible keep", cell: "col-start-3 row-start-2 md:col-start-4 md:row-start-1" },
] as const;

const COLUMNS = "grid grid-cols-3 gap-x-4 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_9rem]";
// The last column is fixed, not auto, so the header row and every sale row line up.

/**
 * Every sale on this device, newest first, with what each pile might be worth (founder,
 * 2026-10-27: "Include tallies from the three buckets in each sale row / Don't make content on
 * the second line like this where we don't have to"). The name opens the sale.
 */
export default function SaleList({ entries, onDelete }: SaleListProps) {
  const [confirm, setConfirm] = useState<string | null>(null);
  return (
    <div>
      <div className={`${COLUMNS} hidden border-b border-border pb-2 md:grid`} aria-hidden>
        <span className="text-caption text-muted-foreground">Sale</span>
        {PILES.map((p) => (
          <span key={p.key} className="text-caption text-muted-foreground">
            {p.label}
          </span>
        ))}
        <span />
      </div>
      <ul className="divide-y divide-border">
        {entries.map((e) => {
          const status = saleStatus(e);
          const name = e.name?.trim() || "Untitled sale";
          return (
            <li key={e.id} className={`${COLUMNS} items-center gap-y-2 py-4`}>
              <Link href={paths.sale(e.id)} className="col-span-2 col-start-1 row-start-1 min-w-0 md:col-span-1">
                <Inline gap={8} align="center">
                  <span className="min-w-0 break-words text-body-lg text-foreground">{name}</span>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </Inline>
              </Link>
              {PILES.map((p) => {
                const t = e.tallies?.[p.key];
                return (
                  <p key={p.key} className={`${p.cell} min-w-0`}>
                    <span className="block text-caption text-muted-foreground md:sr-only">{p.label}</span>
                    <span className={`block text-body ${t?.count ? "text-foreground" : "text-muted-foreground"}`}>{t?.count ? formatTally(t) : "—"}</span>
                  </p>
                );
              })}
              <div className="col-start-3 row-start-1 justify-self-end md:col-start-5">
                {confirm === e.id ? (
                  <Inline gap={8} justify="end">
                    <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>
                      Keep
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => { onDelete(e.id); setConfirm(null); }}>
                      Delete
                    </Button>
                  </Inline>
                ) : (
                  <Button size="sm" variant="ghost" aria-label={`Delete ${name}`} onClick={() => setConfirm(e.id)}>
                    Delete
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
