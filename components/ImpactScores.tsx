"use client";

import { useState } from "react";
import type { ImpactRationale, ImpactScores } from "@/types";
import type { HistoryEntry } from "@/lib/notion-history";
import { calculateImpactTotal } from "@/lib/scoring";
import {
  IMPACT_ANCHORS,
  IMPACT_DIMENSIONS,
  IMPACT_DIMENSION_LABELS,
  type ImpactDimensionKey,
} from "@/lib/rubric";

interface ImpactScoresProps {
  scores: ImpactScores;
  rationale?: ImpactRationale;
  history?: HistoryEntry[];
}

type TabKey = ImpactDimensionKey | "history";

/** The dimension's 1-5 anchor legend as a white reference card; the scored
 * anchor is bold, the rest regular — weight is the only differentiator. */
function Legend({
  dimension,
  score,
}: {
  dimension: ImpactDimensionKey;
  score: number;
}) {
  return (
    <div className="rounded-lg bg-white p-4 flex flex-col gap-2">
      {IMPACT_ANCHORS[dimension].map((anchor) => {
        const active = anchor.score === score;
        return (
          <div
            key={anchor.score}
            className={`flex gap-2 text-xs leading-normal text-text-dark ${
              active ? "font-bold" : "font-normal"
            }`}
          >
            <span className="w-3 shrink-0 text-right">{anchor.score}</span>
            <span>{anchor.text}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Dated milestone list, same shape as the former standalone History band. */
function HistoryList({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-text-dark-secondary">No milestones yet.</p>
    );
  }
  return (
    <ol className="flex flex-col gap-4">
      {entries.map((entry, index) => (
        <li
          key={`${entry.date}-${index}`}
          className="flex flex-col sm:flex-row sm:gap-4"
        >
          <span className="w-[88px] shrink-0 font-mono text-[13px] tabular-nums text-text-dark-secondary sm:text-right">
            {entry.month}
          </span>
          <span className="text-sm leading-[1.7] text-text-dark">
            {entry.milestone}
            {entry.receiptUrl && (
              <>
                {" "}
                <a
                  href={entry.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whitespace-nowrap font-mono text-[12px] text-text-dark-secondary underline decoration-border-dark underline-offset-2 transition-colors hover:text-text-dark"
                >
                  receipt ↗
                </a>
              </>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * v3 impact score block for the experiment detail page, per the approved
 * Figma (scoring-impact-rubric, page 02.8): `IMPACT SCORE n/15` head, a
 * Personal / Social / Business / History tab bar with a score badge on each
 * dimension tab, then the selected tab's content — the dimension's anchor
 * legend card followed by its justification, or the milestone list.
 */
export default function ImpactScoresDisplay({
  scores,
  rationale,
  history = [],
}: ImpactScoresProps) {
  const [tab, setTab] = useState<TabKey>("personal");
  const total = calculateImpactTotal(scores);

  return (
    <section className="max-w-[720px]">
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium uppercase tracking-[0.08em] text-text-dark-secondary">
          Impact score
        </span>
        {total !== null && (
          <span className="text-[13px] font-semibold text-text-dark">
            {total}/15
          </span>
        )}
      </div>

      <div
        role="tablist"
        className="mt-2 flex items-stretch border-b border-border"
      >
        {IMPACT_DIMENSIONS.map((dimension) => {
          const active = tab === dimension;
          return (
            <button
              key={dimension}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(dimension)}
              className={`flex items-center gap-1.5 p-4 text-sm font-medium transition-colors ${
                active
                  ? "border-b-2 border-accent-primary text-text-dark"
                  : "text-text-dark-secondary hover:text-text-dark"
              }`}
            >
              {IMPACT_DIMENSION_LABELS[dimension]}
              <span className="rounded bg-background-active px-2.5 py-2 text-[11px] font-semibold leading-none text-text-dark-secondary">
                {scores[dimension]}
              </span>
            </button>
          );
        })}
        <button
          role="tab"
          aria-selected={tab === "history"}
          onClick={() => setTab("history")}
          className={`flex items-center p-4 text-sm font-medium transition-colors ${
            tab === "history"
              ? "border-b-2 border-accent-primary text-text-dark"
              : "text-text-dark-secondary hover:text-text-dark"
          }`}
        >
          History
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {tab === "history" ? (
          <HistoryList entries={history} />
        ) : (
          <>
            <Legend dimension={tab} score={scores[tab]} />
            {rationale?.[tab] ? (
              <p className="whitespace-pre-wrap text-sm leading-[1.7] text-text-dark">
                {rationale[tab]}
              </p>
            ) : (
              <p className="text-sm text-text-dark-secondary">
                No justification written yet.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
