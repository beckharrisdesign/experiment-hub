/**
 * Tests for the Google Ads conversion fired on the paid image view:
 *   lib/etsy-listing-kit/analytics.ts — trackAdsConversion()
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

/**
 * Regression: the ELK account was briefly `gtag('config', …)`'d in the ROOT
 * layout, so every hub page (/heuristics, /prototypes, …) reported into the
 * standalone ELK Ads account — rebuilding the exact "ELK traffic looks like
 * general BHD Labs traffic" problem the separate account exists to solve, and
 * seeding its remarketing lists with visitors who never saw the product.
 *
 * These assertions read source text rather than render, because the defect is
 * *where* the config statement lives — which rendering a component in isolation
 * cannot express. Kept in this file rather than its own suite: an extra test
 * file shifts vitest's worker scheduling and surfaces unrelated latent races.
 */
describe("Google Ads tag scoping", () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

  it("root layout configures ONLY the hub Ads account", () => {
    const src = read("app/layout.tsx");
    expect(src).toContain("GOOGLE_ADS_ID");
    expect(src).not.toContain(ELK_GOOGLE_ADS_ID);
    expect(src).not.toContain("ELK_GOOGLE_ADS_ID");
  });

  it("ELK segment layout configures the ELK Ads account", () => {
    const src = read("app/etsy-listing-kit/layout.tsx");
    expect(src).toContain("ELK_GOOGLE_ADS_ID");
    expect(src).toContain("gtag('config'");
  });

  it("no shared array re-introduces a config-everything list", () => {
    expect(read("lib/analytics/ga.ts")).not.toContain("GOOGLE_ADS_IDS");
  });
});
