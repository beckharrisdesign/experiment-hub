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
/** The 1600 px originals kept on the device for re-cropping (sold-comps design D1). */
export const PHOTO_STORE = {
  dbName: "esp-photos",
  maxEdgePx: 1600,
  jpegQuality: 0.8,
  /** About 10 full 48-photo rooms; the oldest sale's originals go first past this. */
  capBytes: 150 * 1024 * 1024,
} as const;

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
 * Sold-price lookup (sold-comps change, PR 2). Review queue #59: a lookup runs only for
 * Sell items at or above a band threshold — most of a house is under $25 and a real
 * sold price can't move it; $100 is where it changes the family's decision.
 *
 * The threshold is a token, not a hard-coded rule (founder, 2026-10-31: "Tokenize that choice -
 * and put it in my profile"): `minBand` is the default, and each person picks their own from
 * `minBandChoices` in Account & profile (lib/estate-sale-planner/profile.ts). The server accepts
 * only one of these choices, so the lowest one is the spend floor.
 */
export const COMPS = {
  /** Default threshold: the $100–$250 band and up. */
  minBand: "$100–$250",
  /** The thresholds the profile offers, low to high (the #59 alternatives: $25, $100, $500). */
  minBandChoices: ["$25–$50", "$100–$250", "$500–$2,000"],
  /** A saved lookup younger than this is reused, from any sale (review queue #63). */
  freshDays: 90,
  /** Matching sold listings needed before they replace the model's band (review queue #64). */
  minMatches: 3,
  /** Listings sent to the comps pass; the provider returns up to 240 a page. */
  maxListings: 25,
  /** Kept listings the item links to. */
  citeListings: 3,
  /** The provider call gives up after this (design D5). */
  timeoutMs: 8_000,
} as const;

/**
 * Sold-listings providers (design D5, review queue #62). `COMPS_PROVIDER` picks one (default
 * compsapi) and `COMPS_API_KEY` keys it, both server-only. Read from https://compsapi.com/docs
 * and /pricing on 2026-11-02: GET /v1/sold, `X-API-Key`, a User-Agent is required, prices in
 * USD. Starter is $9 for 5,000 requests a month with no overage, so a request is 0.18¢.
 */
export const COMPS_PROVIDERS = {
  compsapi: {
    url: "https://api.compsapi.com/v1/sold",
    pricePerRequestCents: 0.18,
  },
} as const;

/**
 * The text-only steps (writing a search query, reading comps) use the smallest model of each
 * provider, in the same provider order as the walkthrough (design D4).
 */
export const TEXT_MODELS = {
  openai: process.env.ESP_OPENAI_TEXT_MODEL || "gpt-5-nano",
  anthropic: process.env.ESP_ANTHROPIC_TEXT_MODEL || "claude-haiku-5-5",
} as const;

/**
 * Standard-tier prices in USD per million tokens, for the cost ledger (design D8). Read from
 * the vendor pages on 2026-11-02: developers.openai.com/api/docs/pricing and
 * platform.claude.com/docs/en/about-claude/pricing (Haiku at the ≤100K-token prompt rate, which
 * every call here is). Check again when a model changes; an unknown model records 0¢.
 */
export const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  "gpt-5": { input: 1.25, output: 10 },
  "gpt-5-mini": { input: 0.25, output: 2 },
  "gpt-5-nano": { input: 0.05, output: 0.4 },
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};

/** Browser-side session key; closing the tab loses it, and the UI says so. v2: destinations. */
export const SESSION_STORAGE_KEY = "esp:session:v2";

/**
 * The Sell Sheet: the sell list with its photos, saved at a link that survives
 * closing the tab. Built as a one-time Stripe Checkout (etsy-listing-kit
 * wiring) and left unlinked. Payment is not wired for now, and the sheet is
 * not where a fee is planned (founder, 2026-10-30: "it'll be a fee to do the
 * digging for pricing but everything else can stay free") — the future paid
 * step is the sold-price lookup; review queue #32.
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
