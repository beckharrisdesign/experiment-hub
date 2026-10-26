/**
 * Estate Sale Planner — the knobs that bound the demo.
 *
 * Everything that decides cost or where the exit points lives here so the
 * validation plan (openspec/changes/estate-sale-planner/propose.md) can be
 * tuned without touching the flow. Photo budget × model price is the whole
 * per-pass cost; the Propose kill criterion is $1.00.
 */

export const EXPERIMENT_ID = "estate-sale-planner";

/**
 * Vision models, one per provider. The provider is chosen by which key the
 * environment carries — OPENAI_API_KEY first, because it is the hub's one
 * synced model key (`.env.example`, scripts/sync-secrets.sh), ANTHROPIC_API_KEY
 * as the alternate (same order as etsy-listing-kit's composer).
 */
export const VISION_MODELS = {
  openai: process.env.ESP_OPENAI_VISION_MODEL || "gpt-5",
  anthropic: process.env.ESP_ANTHROPIC_VISION_MODEL || "claude-opus-5-5",
} as const;

/**
 * Photo budget (round 05a). Photos are the capture primitive — the family
 * photographs a room, each shot is one frame to the model — so there is no
 * sampling or de-duplication any more; the cap is the whole cost bound.
 * Founder, 2026-10-15: "stick to images - a live camera instead of video".
 */
export const PHOTO_BUDGET = {
  /** Hard cap on photos sent per pass; the grid keeps the first this many. */
  maxPhotos: 48,
  /** Longest edge of each sent photo, in px. Rooms read fine at this size. */
  maxEdgePx: 768,
  /** JPEG quality for sent photos (0–1). */
  jpegQuality: 0.72,
} as const;

/**
 * Detail shots — a seam, a stamp on the bottom, a maker's mark. Larger than a
 * walkthrough frame because the point is legibility; capped per item so one
 * curious user cannot run up the re-read bill.
 */
export const DETAIL_SHOT = {
  maxEdgePx: 1024,
  jpegQuality: 0.8,
  maxPerItem: 3,
} as const;

/**
 * The primary exit (round 03): a donation pickup for the Donate list. There
 * is no Toss pile — keep, sell, donate are the only destinations (founder
 * instruction) — so the referral moved from junk removal to charity pickup.
 * Pickup Please (Vietnam Veterans of America) schedules free home pickups
 * nationwide; no partner deal exists yet (review queue #7, #37), so
 * `referral` is a placeholder parameter. `tel:` is the one-tap path.
 */
export const DONATE_PICKUP = {
  name: "Pickup Please",
  tel: "tel:+18007758387",
  web: "https://pickupplease.org/",
  referral: "bhd-labs-esp",
  /** Shown when the user says the service doesn't cover them. */
  fallback: {
    name: "Salvation Army pickup",
    web: "https://satruck.org/",
  },
} as const;

/**
 * Haul-away, demoted to a secondary link for the houses that still have a
 * pile no charity will take. Same placeholder referral posture.
 */
export const HAUL_AWAY = {
  name: "1-800-GOT-JUNK",
  tel: "tel:+18004685865",
  web: "https://www.1800gotjunk.com/",
  referral: "bhd-labs-esp",
} as const;

/** Browser-side session key; closing the tab loses it, and the UI says so. v2: destinations. */
export const SESSION_STORAGE_KEY = "esp:session:v2";

/**
 * The paid moment on the family's side: the Sell Sheet. The free flow ends in
 * a print; the sheet is the same list with the photos, saved at a link that
 * survives closing the tab and can be sent to siblings or the estate-sale
 * company. One-time Stripe Checkout, same wiring as etsy-listing-kit
 * (review queue #32 for the price).
 */
export const SELL_SHEET = {
  priceCents: 500,
  currency: "usd",
  productName: "Estate Sale Planner — Sell Sheet",
  productDescription: "Your sell list with photos, saved at a link you can share.",
  statementSuffix: "SELL SHEET",
  /** Largest data-URL thumbnail accepted per item on checkout (bytes). */
  maxImageBytes: 60_000,
  maxItems: 120,
} as const;
