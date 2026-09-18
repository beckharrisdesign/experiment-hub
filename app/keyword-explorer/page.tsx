import type { Metadata } from "next";
import BulkKeywordTable from "@/components/BulkKeywordTable";
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
    <div className="min-h-screen">
      <main className="w-full p-8">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
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

          {corpus.bulkKeywordRows.length > 0 && (
            <section className="flex flex-col gap-2">
              <header className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold text-text-primary">
                  Bulk Keywords — related-term suggestions
                </h3>
                <p className="text-sm text-text-secondary">
                  {corpus.bulkKeywordRows.length} terms from eRank&apos;s Bulk
                  Keywords tool, a different instrument from the table above:
                  related-term suggestions for a seed list, not a per-seed
                  demand table. &ldquo;&lt; N&rdquo; means eRank capped the
                  value rather than reporting it exactly; a dash means it was
                  never scored at all — neither is 0.
                </p>
              </header>
              <BulkKeywordTable rows={corpus.bulkKeywordRows} />
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
