/**
 * Estate Sale Planner — the knobs that bound the demo.
 *
 * Everything that decides cost or where the exit points lives here so the
 * validation plan (openspec/changes/estate-sale-planner/propose.md) can be
 * tuned without touching the flow. Frame budget × model price is the whole
 * per-walkthrough cost; the Propose kill criterion is $1.00.
 */

export const EXPERIMENT_ID = "estate-sale-planner";

/** Vision model for the flag pass. Opus 5.5 is the default per the claude-api skill. */
export const VISION_MODEL = process.env.ESP_VISION_MODEL || "claude-opus-5-5";

export const FRAME_BUDGET = {
  /** Seconds between sampled frames of a walkthrough video. */
  intervalSeconds: 2.5,
  /** Hard cap on frames sent per walkthrough, after de-duplication. */
  maxFrames: 48,
  /** Longest edge of each sent frame, in px. Rooms read fine at this size. */
  maxEdgePx: 768,
  /** JPEG quality for sent frames (0–1). */
  jpegQuality: 0.72,
  /**
   * Near-duplicate threshold on 8×8 greyscale thumbnails: mean absolute
   * difference (0–255) below which a frame is dropped as "same view".
   */
  duplicateMeanDiff: 12,
} as const;

/**
 * Haul-away exit. The affiliate deal does not exist yet (review queue #7);
 * `referral` is a placeholder parameter so the tap is attributable the day
 * one does. `tel:` is the one-tap path on a phone.
 */
export const HAUL_AWAY = {
  name: "1-800-GOT-JUNK",
  tel: "tel:+18004685865",
  web: "https://www.1800gotjunk.com/",
  referral: "bhd-labs-esp",
  /** Shown when the user says the service doesn't cover them. */
  fallback: {
    name: "find a hauler near you",
    web: "https://www.google.com/maps/search/junk+removal+near+me",
  },
} as const;

/** Browser-side session key; closing the tab loses it, and the UI says so. */
export const SESSION_STORAGE_KEY = "esp:session:v1";
