import type { Metadata } from "next";
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
  const { rows: withLive, titles } = await withTargeting(corpus.rows);
  const rows = toTableRows(withLive, titles);

  // Seven instruments reach the table: three eRank exports (Keyword Tool,
  // Bulk Keywords, Tag Report), two real-world traction joins (Ranked from
  // Spotted on Etsy, Targeting from live listing snapshots), and two captured
  // -demand sources scraped from Shop Manager (Shop search terms, Etsy Ads
  // targeted keywords).
  const SOURCES = 7;

  return (
    <div className="min-h-screen">
      <main className="w-full p-8">
        {/*
        Full bleed, deliberately breaking the site's usual max-w-[1200px]
        (design.md Decision 12). Every pixel withheld is a column the reader
        has to scroll for. Honest accounting: at 1440 this buys ~240px, about
        three narrow columns, and the table still scrolls — it does not make a
        2,700px join fit.
      */}
      <div className="flex w-full flex-col gap-6">
          <header className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold text-text-primary">
              Keyword Explorer
            </h2>
            <p className="text-sm text-text-secondary">
              {/* Keywords, not observations: one row is one keyword now, and a
                  keyword captured twice is a single row carrying its newest
                  values (design.md decision 5). */}
              {corpus.rows.length.toLocaleString()} keywords across {SOURCES}{" "}
              sources. Sort or filter on any column.
            </p>
          </header>

          <KeywordTable rows={rows} />
        </div>
      </main>
    </div>
  );
}
