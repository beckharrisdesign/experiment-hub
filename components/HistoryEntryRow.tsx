import React from "react";
import type { HistoryEntry } from "@/lib/notion-history";

/**
 * One History entry: the date at its natural grain in the mono gutter, the
 * milestone sentence with its optional receipt link, and — when the entry's
 * Notion page body carries a source log — the attributed source lines
 * (gh / supabase / notion / Katy voices) in a quiet block beneath.
 *
 * Shared by the standalone History band and the Impact Score History tab so
 * the two render paths cannot drift.
 */
export default function HistoryEntryRow({ entry }: { entry: HistoryEntry }) {
  return (
    <li className="flex flex-col sm:flex-row sm:gap-4">
      {/* Fixed gutter, never wrapped: a date broken across two lines reads as
       * two dates. 128px holds formatDateSpan's longest output — the 17-char
       * cross-year span "Jul 2024–Mar 2026" — at the mono ramp's 0.6em advance. */}
      <span className="w-[128px] shrink-0 whitespace-nowrap font-mono text-xs tabular-nums text-text-dark-secondary sm:text-right">
        {entry.when}
      </span>
      <div className="min-w-0">
        <span className="text-body text-text-dark">
          {entry.milestone}
          {entry.receiptUrl && (
            <>
              {" "}
              <a
                href={entry.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="whitespace-nowrap font-mono text-xs text-text-dark-secondary underline decoration-border-dark underline-offset-2 transition-colors hover:text-text-dark"
              >
                receipt ↗
              </a>
            </>
          )}
        </span>
        {entry.sources.length > 0 && (
          <div className="mt-2 flex flex-col gap-2 border-l border-border-dark/40 pl-4">
            {entry.sources.map((line, lineIndex) => (
              <p
                key={lineIndex}
                className="text-small text-text-dark-secondary"
              >
                {line.map((span, spanIndex) => {
                  let node: React.ReactNode = span.text;
                  if (span.code) {
                    node = <code className="font-mono text-xs">{node}</code>;
                  }
                  if (span.bold) {
                    node = (
                      <strong className="font-medium text-text-dark">
                        {node}
                      </strong>
                    );
                  }
                  if (span.href) {
                    node = (
                      <a
                        href={span.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline decoration-border-dark underline-offset-2 transition-colors hover:text-text-dark"
                      >
                        {node}
                      </a>
                    );
                  }
                  return (
                    <React.Fragment key={spanIndex}>{node}</React.Fragment>
                  );
                })}
              </p>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}
