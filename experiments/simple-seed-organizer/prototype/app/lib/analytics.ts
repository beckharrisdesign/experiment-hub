/**
 * Lightweight GA4 event tracking for the Simple Seed Organizer launch.
 *
 * Wraps `window.gtag` so the rest of the app fires typed, PRD-aligned events
 * without touching the global directly. Every helper is a safe no-op when GA
 * is not loaded (local dev, tests, or when `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`
 * is unset), so call sites never need to guard.
 *
 * Events map to the PRD "failing tests" (docs/PRD.md → Success Metrics):
 *   - sign_up                → baseline acquisition + return-session keying
 *   - seed_added             → import vs. manual mix
 *   - search_performed       → time-to-find (query → narrowed list)
 *   - seed_opened            → time-to-find (search → open a known packet)
 *   - use_first_filter_used  → Use First filter adoption
 *   - save_error/import_error → save/load/import reliability
 */

type GtagParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export type SeedAddMethod = "manual" | "import_review" | "import_auto";

/**
 * Resolve `gtag` off the global. Uses `globalThis` (=== `window` in the
 * browser, always defined under Node/test) so the module never references a
 * bare `window` that would throw outside the browser.
 */
function isOptedOut(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("analytics_optout") === "true";
}

function getGtag(): ((...args: unknown[]) => void) | undefined {
  if (isOptedOut()) return undefined;
  const g = globalThis as { gtag?: (...args: unknown[]) => void };
  return typeof g.gtag === "function" ? g.gtag : undefined;
}

/** Fire a raw GA4 event. Safe no-op when gtag is unavailable. */
export function trackEvent(name: string, params: GtagParams = {}): void {
  getGtag()?.("event", name, params);
}

/** Associate subsequent events with a user, for return-session analysis. */
export function setAnalyticsUser(userId: string | null): void {
  getGtag()?.("set", { user_id: userId ?? undefined });
}

/** Account created (PRD: baseline acquisition / repeat-use keying). */
export function trackSignUp(method = "email"): void {
  trackEvent("sign_up", { method });
}

/** A seed entered inventory (PRD: import vs. manual mix). */
export function trackSeedAdded(opts: {
  method: SeedAddMethod;
  seedType?: string;
}): void {
  trackEvent("seed_added", {
    method: opts.method,
    seed_type: opts.seedType ?? "unknown",
  });
}

/** A search settled to a result set (PRD: time-to-find). */
export function trackSearchPerformed(opts: {
  queryLength: number;
  resultCount: number;
  msToResults: number;
}): void {
  trackEvent("search_performed", {
    query_length: opts.queryLength,
    result_count: opts.resultCount,
    ms_to_results: Math.round(opts.msToResults),
  });
}

/**
 * A seed detail was opened. When it follows an active search,
 * `msSinceSearchStart` captures true time-to-find (PRD: <10s on a 50+ list).
 */
export function trackSeedOpened(opts: {
  fromSearch: boolean;
  msSinceSearchStart?: number;
}): void {
  trackEvent("seed_opened", {
    from_search: opts.fromSearch,
    ...(opts.msSinceSearchStart != null
      ? { ms_since_search_start: Math.round(opts.msSinceSearchStart) }
      : {}),
  });
}

/** The Use First filter was applied (PRD: Use First adoption, not zero). */
export function trackUseFirstFilter(opts: { resultCount: number }): void {
  trackEvent("use_first_filter_used", { result_count: opts.resultCount });
}

/**
 * Fire a Google Ads conversion event for new account sign-up.
 * Conversion action: AW-10904266222/dX8MCLuApMQcEO7Lx88o
 * Safe no-op when gtag is absent.
 */
export function trackAdsSignUp(): void {
  getGtag()?.("event", "conversion", {
    send_to: "AW-10904266222/dX8MCLuApMQcEO7Lx88o",
  });
}

/** A save/import failed (PRD: reliability — error rate low enough to trust). */
export function trackSaveError(opts: {
  context: SeedAddMethod;
  message: string;
}): void {
  const name = opts.context === "manual" ? "save_error" : "import_error";
  trackEvent(name, {
    context: opts.context,
    // GA4 caps param values at 100 chars; keep messages short and PII-free.
    message: opts.message.slice(0, 100),
  });
}
