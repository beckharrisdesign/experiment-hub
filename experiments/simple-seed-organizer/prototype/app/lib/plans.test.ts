import { describe, it, expect } from "vitest";
import {
  PLANS,
  TIER_ORDER,
  getTierIndex,
  normalizeTier,
  getUpgradeTiers,
  getDowngradeTiers,
  buildPriceToTierMap,
} from "./plans";

describe("TIER_ORDER", () => {
  it("has two tiers in ascending order", () => {
    expect(TIER_ORDER).toEqual(["Seed Stash Starter", "Home Garden"]);
  });
});

describe("PLANS", () => {
  it("has one entry per tier", () => {
    expect(PLANS).toHaveLength(2);
    expect(PLANS.map((p) => p.id)).toEqual([...TIER_ORDER]);
  });

  it("Starter tier is free with no Stripe price", () => {
    const starter = PLANS.find((p) => p.id === "Seed Stash Starter")!;
    expect(starter.price).toBe("Free");
    expect(starter.priceId).toBeUndefined();
  });

  it("Home Garden is the paid yearly plan", () => {
    const paid = PLANS.find((p) => p.id === "Home Garden")!;
    expect(paid.price).toBe("$15/year");
    expect(paid.seeds).toBe("Unlimited");
  });
});

describe("normalizeTier", () => {
  it("passes through canonical tier names unchanged", () => {
    expect(normalizeTier("Seed Stash Starter")).toBe("Seed Stash Starter");
    expect(normalizeTier("Home Garden")).toBe("Home Garden");
  });

  it('maps legacy paid tiers to "Home Garden"', () => {
    expect(normalizeTier("Serious Hobby")).toBe("Home Garden");
    expect(normalizeTier("Paid")).toBe("Home Garden");
  });

  it('maps unknown tiers to "Seed Stash Starter"', () => {
    expect(normalizeTier("unknown")).toBe("Seed Stash Starter");
    expect(normalizeTier("")).toBe("Seed Stash Starter");
  });
});

describe("getTierIndex", () => {
  it("returns 0 for Seed Stash Starter", () => {
    expect(getTierIndex("Seed Stash Starter")).toBe(0);
  });

  it("returns 1 for Home Garden", () => {
    expect(getTierIndex("Home Garden")).toBe(1);
  });

  it("returns 1 for legacy paid tiers", () => {
    expect(getTierIndex("Serious Hobby")).toBe(1);
    expect(getTierIndex("Paid")).toBe(1);
  });

  it("returns 0 for an unknown tier", () => {
    expect(getTierIndex("unknown-tier")).toBe(0);
    expect(getTierIndex("")).toBe(0);
  });
});

describe("getUpgradeTiers", () => {
  it("returns 1 upgrade option from Starter", () => {
    const upgrades = getUpgradeTiers("Seed Stash Starter");
    expect(upgrades).toHaveLength(1);
    expect(upgrades[0].id).toBe("Home Garden");
  });

  it("returns no upgrades from the top tier", () => {
    expect(getUpgradeTiers("Home Garden")).toHaveLength(0);
  });

  it("treats an unknown tier as Starter (index 0)", () => {
    expect(getUpgradeTiers("unknown")).toHaveLength(1);
  });
});

describe("getDowngradeTiers", () => {
  it("returns no downgrades from Starter", () => {
    expect(getDowngradeTiers("Seed Stash Starter")).toHaveLength(0);
  });

  it("returns 1 downgrade option from Home Garden", () => {
    const downgrades = getDowngradeTiers("Home Garden");
    expect(downgrades).toHaveLength(1);
    expect(downgrades[0].id).toBe("Seed Stash Starter");
  });
});

describe("buildPriceToTierMap", () => {
  it("returns an object", () => {
    expect(typeof buildPriceToTierMap()).toBe("object");
  });

  it("returns an empty map when Stripe env vars are not set", () => {
    // In CI, NEXT_PUBLIC_STRIPE_PRICE_* are not set — the map should be empty
    // (not undefined, not throw) so callers get a safe default.
    const map = buildPriceToTierMap();
    const keys = Object.keys(map).filter((k) => k !== "undefined");
    expect(keys).toHaveLength(0);
  });
});
