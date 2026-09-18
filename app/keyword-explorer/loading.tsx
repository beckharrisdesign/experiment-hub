import Sidebar from "@/components/Sidebar";

/**
 * Next.js route-segment loading boundary: renders immediately while
 * `page.tsx`'s async work (the corpus load, and `withTargeting()`'s live
 * Supabase read — bounded at 8s, `lib/etsy-sync.ts`) resolves.
 *
 * Without this, a slow Targeting read left anonymous visitors staring at a
 * blank tab for up to that entire 8 seconds — no shell, no indication
 * anything was happening (round 15 finding). The static corpus itself has
 * no Supabase dependency at all; this at least gets the same page frame and
 * a visible "working on it" in front of people immediately, rather than
 * making the slow part of the page (Targeting) block the fast part (everything
 * else) from being *seen*, even though it still blocks it from *rendering*
 * (Non-Goal — see design.md: a full streaming split of Targeting from the
 * static corpus is a bigger change than this loading boundary).
 */
export default function KeywordExplorerLoading() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-64 flex-1 p-8">
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold text-text-primary">
              Keyword Explorer
            </h2>
            <p
              className="text-sm text-text-secondary"
              role="status"
              aria-live="polite"
            >
              Loading…
            </p>
          </header>
        </div>
      </main>
    </div>
  );
}
