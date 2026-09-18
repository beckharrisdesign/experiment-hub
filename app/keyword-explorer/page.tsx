import type { Metadata } from "next";
import BulkKeywordTable from "@/components/BulkKeywordTable";
import KeywordTable from "@/components/KeywordTable";
import { loadKeywordCorpus } from "@/lib/keyword-corpus";
import { toTableRows, withTargeting } from "@/lib/keyword-traction";

export const metadata: Metadata = {
  title: "Keyword Explorer — BHD Labs",
  description:
    "Every keyword observation the shop has captured, as one sortable table.",
};

/**
 * Targeting has to be evaluated at request time, not baked in at build time.
 * `getLatestListingSnapshots()` is a Supabase read, not a Next.js dynamic
 * API (`cookies()`, `headers()`, an uncached `fetch`), so without this the
 * segment is a static-rendering candidate — a build run without Supabase
 * credentials (or simply before a tag ever changes) would cache `targeting:
 * null` for every row and never refresh it. Matches the `force-dynamic`
 * convention already used by every other live-data page in this app
 * (app/page.tsx, app/documentation/page.tsx, app/changes/page.tsx, …).
 *
 * "Request time" is bounded, not literal: `getLatestListingSnapshots()`
 * (`lib/etsy-sync.ts`) holds a 60-second per-server-instance cache, so
 * Targeting can lag a live tag change by up to a minute. `force-dynamic`
 * only rules out baking the value in at build time — it doesn't promise a
 * fresh Supabase read on every single request, and isn't meant to.
 */
export const dynamic = "force-dynamic";

/**
 * A root route, not an experiment — today.
 *
 * Katy, 2026-09-18: "lets surface it at root ... and it might end up an
 * experiment but not today." It is a tool used while writing listings, not a
 * thing being tested, so it sits beside /prototypes and /documentation rather
 * than under /experiments/<slug>. Promotion later moves this file and a
 * data/experiments.json entry; nothing below knows where it is mounted.
 */
export default async function KeywordExplorerPage() {
  const corpus = loadKeywordCorpus();
  const rows = toTableRows(await withTargeting(corpus.rows));
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

          <KeywordTable rows={rows} />

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
