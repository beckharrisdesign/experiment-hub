/**
 * Tests for the Google Ads conversion fired on the paid image view:
 *   lib/etsy-listing-kit/analytics.ts — trackAdsConversion()
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  trackAdsConversion,
  trackFormSubmit,
  ADS_CONVERSION_PURCHASE,
  GA4_FORM_SUBMIT_EVENT,
} from "@/lib/etsy-listing-kit/analytics";
import { ELK_GOOGLE_ADS_ID, GOOGLE_ADS_ID } from "@/lib/analytics/ga";

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

  it("send_to is the standalone ELK Ads account + Sign-up conversion label", () => {
    // Pinned against the Google Ads tag spec, not against whatever the code
    // currently exports — this assertion is the thing that catches a drifted id.
    expect(ADS_CONVERSION_PURCHASE).toBe("AW-277034089/dX8MCLuApMQcEO7Lx88o");
    expect(ELK_GOOGLE_ADS_ID).toBe("AW-277034089");
  });

  it("does not bill the ELK conversion to the hub Ads account", () => {
    // simple-seed-organizer uses the same label under the hub account; the
    // account prefix is the only thing keeping the two actions apart.
    expect(ELK_GOOGLE_ADS_ID).not.toBe(GOOGLE_ADS_ID);
    expect(ADS_CONVERSION_PURCHASE.startsWith(GOOGLE_ADS_ID)).toBe(false);
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

describe("trackFormSubmit (GA4 event imported as Ads conversion 6657647682)", () => {
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

  it("uses the exact event name the Ads import expects", () => {
    // GA4 event names are case-sensitive; "form_submit" or "formsubmit" will
    // silently never match the imported conversion.
    expect(GA4_FORM_SUBMIT_EVENT).toBe("FormSubmit");
  });

  it("sends FormSubmit tagged with the experiment id", () => {
    trackFormSubmit();

    expect(window.gtag).toHaveBeenCalledWith("event", "FormSubmit", {
      experiment_id: "etsy-listing-kit",
    });
  });

  it("no-ops when gtag is not loaded", () => {
    delete window.gtag;
    expect(() => trackFormSubmit()).not.toThrow();
  });

  it("respects the analytics opt-out", () => {
    window.localStorage.setItem("analytics_optout", "true");
    trackFormSubmit();

    expect(window.gtag).not.toHaveBeenCalled();
  });
});
