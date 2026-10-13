"use client";

import { Button, Inline, Stack } from "@beckharrisdesign/mvds";
import type { HistoryEntry } from "../../lib/estate-sale-planner/storage";

interface HistoryProps {
  entries: HistoryEntry[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

/** Earlier walkthroughs saved on this device — the only history a no-account product has. */
export default function History({ entries, onOpen, onDelete }: HistoryProps) {
  if (entries.length === 0) return null;
  return (
    <Stack gap={16}>
      <Stack gap={4}>
        <p className="text-caption uppercase tracking-wider text-muted-foreground">On this device</p>
        <h2 className="text-h3 text-foreground">Earlier walkthroughs</h2>
      </Stack>
      <ul className="divide-y divide-border">
        {entries.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="text-body text-foreground">{new Date(e.createdAt).toLocaleDateString()} · {e.items} items</p>
              <p className="text-small text-muted-foreground">
                {e.sell} sell · {e.keep} keep · {e.donate} donate{e.undecided > 0 ? ` · ${e.undecided} to sort` : ""}
              </p>
            </div>
            <Inline gap={8}>
              <Button size="sm" variant="outline" onClick={() => onOpen(e.id)}>
                Open
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDelete(e.id)}>
                Delete
              </Button>
            </Inline>
          </li>
        ))}
      </ul>
    </Stack>
  );
}
