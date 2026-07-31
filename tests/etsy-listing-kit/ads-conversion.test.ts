/**
 * Tests for the Google Ads conversion fired on the paid image view:
 *   lib/etsy-listing-kit/analytics.ts — trackAdsConversion()
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  trackAdsConversion,
  ADS_CONVERSION_PURCHASE,
} from "@/lib/etsy-listing-kit/analytics";
import { GOOGLE_ADS_ID } from "@/lib/analytics/ga";

describe("trackAdsConversion", () => {
  // Minimal localStorage stand-in (jsdom's here lacks removeItem).
  let store: Record<string, string>;

  beforeEach(() => {
    window.gtag = vi.fn();
    store = {};
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
      },
    });
  });

  afterEach(() => {
    delete window.gtag;
  });

  it("sends a conversion with the Ads label, value, and transaction id", () => {
    trackAdsConversion("order-abc-123");

    expect(window.gtag).toHaveBeenCalledWith("event", "conversion", {
      send_to: ADS_CONVERSION_PURCHASE,
      value: 3,
      currency: "USD",
      transaction_id: "order-abc-123",
    });
  });

  it("send_to is the Ads account + Sign-up conversion label", () => {
    expect(ADS_CONVERSION_PURCHASE).toBe(
      `${GOOGLE_ADS_ID}/dX8MCLuApMQcEO7Lx88o`,
    );
    expect(GOOGLE_ADS_ID).toBe("AW-10904266222");
  });

  it("no-ops when gtag is not loaded", () => {
    delete window.gtag;
    expect(() => trackAdsConversion("order-abc-123")).not.toThrow();
  });

  it("respects the analytics opt-out", () => {
    window.localStorage.setItem("analytics_optout", "true");
    trackAdsConversion("order-abc-123");

    expect(window.gtag).not.toHaveBeenCalled();
  });
});
