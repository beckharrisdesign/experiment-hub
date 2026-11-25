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

  it("send_to matches the snippet Google Ads shows for the kit's action", () => {
    // Copied from the "Etsy Listing Kit purchase" event snippet in Ads account
    // 671-160-6591, read live 2026-11-25. Re-read it there before changing this.
    expect(ADS_CONVERSION_PURCHASE).toBe(
      "AW-10904266222/824ACMGWur8dEO7Lx88o",
    );
    expect(GOOGLE_ADS_ID).toBe("AW-10904266222");
  });

  it("does not share Seed Organizer's Sign-up action", () => {
    expect(ADS_CONVERSION_PURCHASE).not.toContain("dX8MCLuApMQcEO7Lx88o");
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

describe("trackFormSubmit (GA4 event imported as Ads conversion 7917759574)", () => {
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
 * Regression: from 2026-08-07 to 2026-11-25 the ELK segment configured
 * AW-277034089, an id that does not belong to the Ads account the campaign runs
 * in, so no ELK conversion could reach that account. One Ads id is configured,
 * once, in the root layout.
 *
 * These assertions read source text rather than render, because the defect is
 * *where* the config statement lives — which rendering a component in isolation
 * cannot express. Kept in this file rather than its own suite: an extra test
 * file shifts vitest's worker scheduling and surfaces unrelated latent races.
 */
describe("Google Ads tag scoping", () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

  it("root layout configures the Ads account", () => {
    expect(read("app/layout.tsx")).toContain(
      "gtag('config', '${GOOGLE_ADS_ID}')",
    );
  });

  it("ELK segment layout configures no Ads account of its own", () => {
    expect(read("app/etsy-listing-kit/layout.tsx")).not.toContain("gtag(");
  });

  it.each([
    "app/layout.tsx",
    "app/etsy-listing-kit/layout.tsx",
    "lib/analytics/ga.ts",
    "lib/etsy-listing-kit/analytics.ts",
  ])("%s does not send to the unrelated Ads id", (file) => {
    expect(read(file)).not.toContain("AW-277034089");
  });
});
