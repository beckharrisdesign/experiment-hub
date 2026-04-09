import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildPageViewPayload,
  getAnalyticsDataset,
  trackEvent,
  trackPageView,
} from "@/lib/analytics/ga";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

describe("analytics helpers", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    document.title = "BHD Labs";
  });

  it("builds a page view payload from the browser location", () => {
    const payload = buildPageViewPayload("/experiments/seed-finder");

    expect(payload.page_path).toBe("/experiments/seed-finder");
    expect(payload.page_location).toBe(
      "http://localhost:3000/experiments/seed-finder",
    );
    expect(payload.page_title).toBe("BHD Labs");
  });

  it("passes events through to gtag when available", () => {
    const gtag = vi.fn();
    vi.stubGlobal("window", { gtag });

    trackEvent("experiment_click", { experiment_slug: "seed-finder" });

    expect(gtag).toHaveBeenCalledWith("event", "experiment_click", {
      experiment_slug: "seed-finder",
    });
  });

  it("sends page_view through gtag when available", () => {
    const gtag = vi.fn();
    vi.stubGlobal("window", { gtag });

    trackPageView({ page_path: "/workflow" });

    expect(gtag).toHaveBeenCalledWith("event", "page_view", {
      page_path: "/workflow",
    });
  });

  it("extracts tracking metadata from analytics data attributes", () => {
    const anchor = document.createElement("a");
    anchor.dataset.analyticsEvent = "nav_click";
    anchor.dataset.analyticsSurfaceType = "hub";
    anchor.dataset.analyticsSurfaceName = "header";
    anchor.dataset.analyticsTargetPath = "/workflow";

    expect(getAnalyticsDataset(anchor)).toEqual({
      analyticsEvent: "nav_click",
      analyticsSurfaceType: "hub",
      analyticsSurfaceName: "header",
      analyticsTargetPath: "/workflow",
    });
  });
});
