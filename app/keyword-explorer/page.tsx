import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import KeywordTable from "@/components/KeywordTable";
import { loadKeywordCorpus } from "@/lib/keyword-corpus";
import { computeTargeting } from "@/lib/keyword-traction";
import { getLatestListingSnapshots } from "@/lib/etsy-sync";
import type { KeywordRow } from "@/types";

export const metadata: Metadata = {
  title: "Keyword Explorer — BHD Labs",
  description:
    "Every keyword observation the shop has captured, as one sortable table.",
};

/**
 * Targeting reads live listing tags, so a Supabase hiccup (or missing env
 * vars in a preview deploy) must degrade that one column, not the page.
 * Failure reads identically to "no match" — every row's `targeting` stays
 * `null` — and is logged server-side only (design.md § Decisions: no banner,
 * no partial-page error state).
 */
async function withTargeting(rows: KeywordRow[]): Promise<KeywordRow[]> {
  try {
    const snapshots = await getLatestListingSnapshots();
    const targeting = computeTargeting(
      rows.map((r) => r.keyword),
      snapshots,
    );
    return rows.map((row) => ({
      ...row,
      targeting: targeting.get(row.keyword) ?? null,
    }));
  } catch (error) {
    console.error("keyword-explorer: Targeting read failed", error);
    return rows;
  }
}

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
  const rows = await withTargeting(corpus.rows);
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

          <KeywordTable rows={rows} />
        </div>
      </main>
    </div>
  );
}
