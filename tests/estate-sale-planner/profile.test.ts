import { describe, it, expect, beforeEach } from "vitest";
import { COMPS } from "@/lib/estate-sale-planner/config";
import {
  PROFILE_KEY,
  bandMeetsLookup,
  loadProfile,
  lookupChoiceLabel,
  resolveLookupMinBand,
  saveProfile,
} from "@/lib/estate-sale-planner/profile";

// ---------------------------------------------------------------------------
// Review queue #59 · the sold-price lookup threshold is a token with a default, and a
// setting in the profile (founder, 2026-10-31: "Tokenize that choice - and put it in my
// profile").
// ---------------------------------------------------------------------------

describe("the lookup threshold token", () => {
  it("defaults to the $100 band, one of the offered choices", () => {
    expect(COMPS.minBand).toBe("$100–$250");
    expect(COMPS.minBandChoices).toContain(COMPS.minBand);
  });

  it("offers $25, $100 and $500, labelled by their low end", () => {
    expect(COMPS.minBandChoices.map(lookupChoiceLabel)).toEqual(["$25+", "$100+", "$500+"]);
  });

  it("a band meets the threshold when its low end is at or above the threshold's", () => {
    expect(bandMeetsLookup("$50–$100", "$100–$250")).toBe(false);
    expect(bandMeetsLookup("$100–$250", "$100–$250")).toBe(true);
    expect(bandMeetsLookup("over $2,000", "$100–$250")).toBe(true);
    expect(bandMeetsLookup("$25–$50", "$25–$50")).toBe(true);
    expect(bandMeetsLookup("$250–$500", "$500–$2,000")).toBe(false);
  });

  it("reads the bands saved before 2026-10-27 by their low end too", () => {
    expect(bandMeetsLookup("$100–$500", "$100–$250")).toBe(true);
    expect(bandMeetsLookup("$25–$100", "$100–$250")).toBe(false);
    expect(bandMeetsLookup("$25–$100", "$25–$50")).toBe(true);
  });

  it("an unknown band never meets it, so a lookup can't spend on a guess", () => {
    expect(bandMeetsLookup("priceless", "$25–$50")).toBe(false);
  });

  it("the server takes only an offered choice; anything else falls back to the default", () => {
    expect(resolveLookupMinBand("$500–$2,000")).toBe("$500–$2,000");
    expect(resolveLookupMinBand("under $1")).toBe(COMPS.minBand);
    expect(resolveLookupMinBand(undefined)).toBe(COMPS.minBand);
    expect(resolveLookupMinBand(42)).toBe(COMPS.minBand);
  });
});

describe("the profile on the device", () => {
  beforeEach(() => window.localStorage.clear());

  it("starts at the default", () => {
    expect(loadProfile().lookupMinBand).toBe(COMPS.minBand);
  });

  it("keeps a chosen threshold across a reload", () => {
    saveProfile({ lookupMinBand: "$500–$2,000" });
    expect(loadProfile().lookupMinBand).toBe("$500–$2,000");
    expect(JSON.parse(window.localStorage.getItem(PROFILE_KEY)!)).toEqual({ lookupMinBand: "$500–$2,000" });
  });

  it("ignores a saved value that is no longer offered, or isn't JSON", () => {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify({ lookupMinBand: "under $1" }));
    expect(loadProfile().lookupMinBand).toBe(COMPS.minBand);
    window.localStorage.setItem(PROFILE_KEY, "{not json");
    expect(loadProfile().lookupMinBand).toBe(COMPS.minBand);
  });
});
