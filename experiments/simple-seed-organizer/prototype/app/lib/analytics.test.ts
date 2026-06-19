import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  trackEvent,
  setAnalyticsUser,
  trackSignUp,
  trackSeedAdded,
  trackSearchPerformed,
  trackSeedOpened,
  trackUseFirstFilter,
  trackSaveError,
} from "./analytics";

// ---------------------------------------------------------------------------
// Safe no-op when gtag is unavailable
// ---------------------------------------------------------------------------

describe("analytics — no gtag", () => {
  beforeEach(() => {
    delete (globalThis as { gtag?: unknown }).gtag;
  });

  it("trackEvent does not throw when gtag is missing", () => {
    expect(() => trackEvent("sign_up", { method: "email" })).not.toThrow();
  });

  it("setAnalyticsUser does not throw when gtag is missing", () => {
    expect(() => setAnalyticsUser("user-1")).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Forwards to gtag with PRD-aligned event names + params
// ---------------------------------------------------------------------------

describe("analytics — with gtag", () => {
  const gtag = vi.fn();

  beforeEach(() => {
    gtag.mockReset();
    (globalThis as { gtag?: unknown }).gtag = gtag;
  });

  afterEach(() => {
    delete (globalThis as { gtag?: unknown }).gtag;
  });

  it("trackEvent forwards name and params", () => {
    trackEvent("custom", { a: 1 });
    expect(gtag).toHaveBeenCalledWith("event", "custom", { a: 1 });
  });

  it("setAnalyticsUser sets user_id", () => {
    setAnalyticsUser("user-1");
    expect(gtag).toHaveBeenCalledWith("set", { user_id: "user-1" });
  });

  it("setAnalyticsUser(null) clears user_id", () => {
    setAnalyticsUser(null);
    expect(gtag).toHaveBeenCalledWith("set", { user_id: undefined });
  });

  it("trackSignUp defaults method to email", () => {
    trackSignUp();
    expect(gtag).toHaveBeenCalledWith("event", "sign_up", { method: "email" });
  });

  it("trackSeedAdded carries method and seed_type", () => {
    trackSeedAdded({ method: "import_auto", seedType: "tomato" });
    expect(gtag).toHaveBeenCalledWith("event", "seed_added", {
      method: "import_auto",
      seed_type: "tomato",
    });
  });

  it("trackSeedAdded falls back to unknown seed_type", () => {
    trackSeedAdded({ method: "manual" });
    expect(gtag).toHaveBeenCalledWith("event", "seed_added", {
      method: "manual",
      seed_type: "unknown",
    });
  });

  it("trackSearchPerformed rounds ms_to_results", () => {
    trackSearchPerformed({ queryLength: 5, resultCount: 3, msToResults: 120.7 });
    expect(gtag).toHaveBeenCalledWith("event", "search_performed", {
      query_length: 5,
      result_count: 3,
      ms_to_results: 121,
    });
  });

  it("trackSeedOpened omits ms_since_search_start when absent", () => {
    trackSeedOpened({ fromSearch: false });
    expect(gtag).toHaveBeenCalledWith("event", "seed_opened", {
      from_search: false,
    });
  });

  it("trackSeedOpened includes rounded time-to-find when from search", () => {
    trackSeedOpened({ fromSearch: true, msSinceSearchStart: 4321.9 });
    expect(gtag).toHaveBeenCalledWith("event", "seed_opened", {
      from_search: true,
      ms_since_search_start: 4322,
    });
  });

  it("trackUseFirstFilter reports result_count", () => {
    trackUseFirstFilter({ resultCount: 7 });
    expect(gtag).toHaveBeenCalledWith("event", "use_first_filter_used", {
      result_count: 7,
    });
  });

  it("trackSaveError uses save_error for manual context", () => {
    trackSaveError({ context: "manual", message: "boom" });
    expect(gtag).toHaveBeenCalledWith("event", "save_error", {
      context: "manual",
      message: "boom",
    });
  });

  it("trackSaveError uses import_error for import contexts and truncates message", () => {
    const long = "x".repeat(150);
    trackSaveError({ context: "import_auto", message: long });
    expect(gtag).toHaveBeenCalledWith("event", "import_error", {
      context: "import_auto",
      message: "x".repeat(100),
    });
  });
});
