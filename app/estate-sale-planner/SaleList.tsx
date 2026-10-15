"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Inline, Stack } from "@beckharrisdesign/mvds";
import { paths } from "../../lib/estate-sale-planner/routes";
import type { HistoryEntry } from "../../lib/estate-sale-planner/storage";

interface SaleListProps {
  entries: HistoryEntry[];
  onDelete: (id: string) => void;
}

/** A sale's state in one word, from its counts. The real lifecycle (listed, closed, sold) is 05b. */
export function saleStatus(e: HistoryEntry): { label: string; variant: "default" | "muted" | "success" } {
  if (e.items === 0) return { label: "Empty", variant: "muted" };
  if (e.undecided > 0) return { label: "Sorting", variant: "default" };
  return { label: "Sorted", variant: "success" };
}

/** Every sale on this device, newest first; the whole row opens it. */
export default function SaleList({ entries, onDelete }: SaleListProps) {
  const [confirm, setConfirm] = useState<string | null>(null);
  return (
    <ul className="divide-y divide-border">
      {entries.map((e) => {
        const status = saleStatus(e);
        return (
          <li key={e.id} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link href={paths.sale(e.id)} className="min-w-0 flex-1">
                <Stack gap={4}>
                  <Inline gap={8} align="center">
                    <span className="truncate text-body-lg text-foreground">{e.name?.trim() || "Untitled sale"}</span>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </Inline>
                  <p className="text-small text-muted-foreground">
                    {new Date(e.createdAt).toLocaleDateString()} · {e.items} {e.items === 1 ? "item" : "items"} · {e.sell} sell · {e.keep} keep · {e.donate} donate
                    {e.undecided > 0 ? ` · ${e.undecided} to sort` : ""}
                  </p>
                </Stack>
              </Link>
              {confirm === e.id ? (
                <Inline gap={8}>
                  <Button size="sm" variant="destructive" onClick={() => { onDelete(e.id); setConfirm(null); }}>
                    Delete
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>
                    Keep
                  </Button>
                </Inline>
              ) : (
                <Button size="sm" variant="ghost" aria-label={`Delete ${e.name?.trim() || "untitled sale"}`} onClick={() => setConfirm(e.id)}>
                  Delete
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
