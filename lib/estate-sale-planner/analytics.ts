/**
 * Typed funnel events for Estate Sale Planner. The transport is the hub's GA
 * helper; nothing is faked when GA is absent. Propose's success thresholds
 * (starts, finish rate, exit taps) and its leading indicator (flag acceptance)
 * are read off these names, so keep them stable.
 */
import { trackEvent } from "../analytics/ga";
import { EXPERIMENT_ID } from "./config";

export type FunnelEvent =
  | "esp_start"
  | "esp_frames_confirmed"
  | "esp_flags_returned"
  | "esp_swipe_complete"
  | "esp_sell_override"
  | "esp_exit_tap"
  | "esp_summary_print";

export function track(event: FunnelEvent, params: Record<string, string | number | boolean | undefined> = {}) {
  trackEvent(event, { experiment_slug: EXPERIMENT_ID, surface_type: "prototype", ...params });
}
