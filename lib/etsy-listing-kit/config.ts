/**
 * Etsy Listing Kit — single source of truth for experiment identity, price,
 * and the revenue acceptance target. Versioned + auditable: change the target
 * here (in git), not in the database or ad hoc.
 *
 * See docs/REVENUE_MODEL.md and openspec/changes/etsy-listing-kit/.
 */

export const EXPERIMENT_ID = 'etsy-listing-kit' as const;

/** Fixed one-time price, in minor units (cents). $3.00. Reviewable (REVIEW_QUEUE #3). */
export const PRICE_CENTS = 300;
export const CURRENCY = 'usd' as const;

/** Curated v1 pack — 6 images, all 2000px square (no video/hero/alt-sizes). */
export const PACK_IMAGE_PX = 2000;
export const PACK_ITEMS = [
  { id: 'flat', label: 'Flat render' },
  { id: 'framed', label: 'Framed mockup' },
  { id: 'in-hoop', label: 'In-hoop mockup' },
  { id: 'detail', label: 'Detail crop' },
  { id: 'scale', label: 'Scale shot' },
  { id: 'info-card', label: '“What you get” card' },
] as const;

/**
 * Business acceptance target. Starts RED and only turns green on real, live,
 * post-launch, refund-adjusted Stripe revenue. Never faked. See revenue:test.
 */
export const REVENUE_TARGET = {
  targetCents: 100_00, // $100
  windowDays: 14,
  currency: CURRENCY,
  /**
   * Production launch timestamp (ISO 8601). Revenue only counts AFTER this.
   * Set at go-live (task 6.2). Null until then — revenue:test treats a null
   * launch as "not launched" and counts nothing.
   */
  launchedAt: null as string | null,
  /** Only live-mode payments count toward the real target. */
  requireLivemode: true,
} as const;

/** Signed-download validity for paid buyers (no account). */
export const DOWNLOAD_TTL_DAYS = 7;

/** Upload limits (client + server enforced). */
export const UPLOAD = {
  maxBytes: 20 * 1024 * 1024, // 20 MB
  acceptedMime: ['image/png', 'image/jpeg', 'image/svg+xml'] as const,
};
