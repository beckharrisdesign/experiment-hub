import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import KeywordTable from "@/components/KeywordTable";
import { loadKeywordCorpus } from "@/lib/keyword-corpus";

export const metadata: Metadata = {
  title: "Keyword Explorer — BHD Labs",
  description:
    "Every keyword observation the shop has captured, as one sortable table.",
};

/**
 * A root route, not an experiment — today.
 *
 * Katy, 2026-09-18: "lets surface it at root ... and it might end up an
 * experiment but not today." It is a tool used while writing listings, not a
 * thing being tested, so it sits beside /prototypes and /documentation rather
 * than under /experiments/<slug>. Promotion later moves this file and a
 * data/experiments.json entry; nothing below knows where it is mounted.
 */
export default function KeywordExplorerPage() {
  const corpus = loadKeywordCorpus();
  const captures = corpus.captures.length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-64 flex-1 p-8">
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold text-text-primary">
              Keyword Explorer
            </h2>
            <p className="text-sm text-text-secondary">
              {corpus.rows.length} observations across {captures}{" "}
              {captures === 1 ? "capture" : "captures"}. Sort or filter on any
              column.
            </p>
          </header>

          <KeywordTable rows={corpus.rows} />
        </div>
      </main>
    </div>
  );
}
