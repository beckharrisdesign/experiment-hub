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
  | "esp_summary_print"
  | "esp_sheet_checkout"
  | "esp_destination_set"
  | "esp_detail_added"
  | "esp_item_refined"
  | "esp_room_appended"
  | "esp_new_walkthrough"
  | "esp_walkthrough_named"
  // sold-comps: item correction
  | "esp_item_confirmed"
  | "esp_item_reread_retry"
  | "esp_item_corrected"
  | "esp_item_message"
  | "esp_photos_evicted"
  // esp-header-affordance: does anyone reach for the menu placeholder?
  | "esp_menu_open"
  // review queue #59: someone changed their sold-price lookup threshold in the profile
  | "esp_lookup_threshold_set";

export function track(
  event: FunnelEvent,
  params: Record<string, string | number | boolean | undefined> = {},
) {
  trackEvent(event, {
    experiment_slug: EXPERIMENT_ID,
    surface_type: "prototype",
    ...params,
  });
}
