import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildPageViewPayload,
  getAnalyticsDataset,
  resolveSurface,
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

  it("tags hub paths as the hub surface", () => {
    expect(resolveSurface("/")).toEqual({
      surface_name: "BHD Labs",
      surface_type: "hub",
    });
    expect(resolveSurface("/experiments/seed-finder").surface_type).toBe("hub");
  });

  it("tags Etsy Listing Kit as its own surface, not hub traffic", () => {
    // Regression: ELK pageviews used to report surface_name "BHD Labs" /
    // surface_type "hub", making ad traffic indistinguishable from hub browsing.
    for (const path of [
      "/etsy-listing-kit",
      "/etsy-listing-kit/result",
      "/etsy-listing-kit?gclid=abc123",
    ]) {
      expect(resolveSurface(path)).toEqual({
        surface_name: "Etsy Listing Kit",
        surface_type: "landing",
        experiment_slug: "etsy-listing-kit",
      });
    }
  });

  it("does not match a path that merely starts with the same characters", () => {
    expect(resolveSurface("/etsy-listing-kit-manager").surface_type).toBe("hub");
  });

  it("carries the surface into the page view payload", () => {
    const payload = buildPageViewPayload("/etsy-listing-kit?gclid=abc123");

    expect(payload.surface_name).toBe("Etsy Listing Kit");
    expect(payload.experiment_slug).toBe("etsy-listing-kit");
    expect(payload.page_path).toBe("/etsy-listing-kit?gclid=abc123");
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
