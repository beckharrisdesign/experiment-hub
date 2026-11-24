"use client";

import { useState } from "react";
import { Button } from "@beckharrisdesign/mvds";

/**
 * Scans that may be more than one document, called out above the list — Figma
 * `02.20`, frames 92:9 and 92:322 (phone).
 * openspec/changes/pdf-metadata-viewer-cloud — task 7j.6.
 *
 * As a conflict's card is to Compare (AttentionCard), each is one link to where it
 * is answered: the split page. Not part of Needs attention, as nothing is wrong.
 */

/** Cards before "Show all". */
const FIRST = 5;

export interface SplitCandidate {
  id: string;
  filename: string | null;
  pageCount: number;
}

interface SplitAlertsProps {
  /** Longest first. */
  candidates: SplitCandidate[];
  /** The list to come back to, as its query string ("" or "?…"). */
  listQuery: string;
}

export default function SplitAlerts({ candidates, listQuery }: SplitAlertsProps) {
  const [all, setAll] = useState(false);
  const shown = all ? candidates : candidates.slice(0, FIRST);

  return (
    <section aria-labelledby="split-first" className="flex flex-col gap-4">
      <h2 id="split-first" className="text-base font-semibold text-text-primary">
        Split first?
      </h2>
      <ul className="flex flex-col gap-3">
        {shown.map((c) => (
          <li key={c.id}>
            <a
              href={`/pdf-metadata-viewer/id/${c.id}/split${listQuery}`}
              className="flex items-center justify-between gap-4 rounded-lg bg-background-secondary p-4 transition-colors hover:bg-background-active focus-visible:outline-2 focus-visible:outline-accent-primary"
            >
              <span className="flex min-w-0 gap-3">
                <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-warning" />
                <span className="flex min-w-0 flex-col gap-1 text-sm">
                  <span className="[overflow-wrap:anywhere]">
                    <span className="font-semibold text-warning">{c.pageCount} pages</span>{" "}
                    <span className="text-text-primary">{c.filename ?? "(unnamed)"}</span>
                  </span>
                  <span className="text-muted-foreground">
                    May be more than one document. Nothing is prefilled until it&apos;s split, or you say it&apos;s one.
                  </span>
                </span>
              </span>
              {/* Drawn as a button so it reads as the action; part of the link. */}
              <Button asChild variant="secondary" size="sm" className="pointer-events-none min-h-11 shrink-0 bg-background-primary">
                <span>Split pages</span>
              </Button>
            </a>
          </li>
        ))}
      </ul>
      {shown.length < candidates.length ? (
        <div className="flex justify-end">
          <Button variant="outline" className="min-h-11" onClick={() => setAll(true)}>
            Show all {candidates.length}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
