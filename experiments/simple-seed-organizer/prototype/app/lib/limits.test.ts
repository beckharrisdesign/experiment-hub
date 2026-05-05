import { describe, it, expect } from "vitest";
import { canAddSeed, canUseAI, canUseAICount, getTierLimits } from "./limits";

// Tier defaults: Starter={seeds:50, ai:50} | Home Garden={seeds:300, ai:20} | Serious Hobby={unlimited}

describe("getTierLimits", () => {
  it("returns correct limits for Seed Stash Starter", () => {
    expect(getTierLimits("Seed Stash Starter")).toEqual({
      seedLimit: 50,
      aiLimit: 50,
    });
  });

  it("returns correct limits for Home Garden", () => {
    expect(getTierLimits("Home Garden")).toEqual({
      seedLimit: 300,
      aiLimit: 20,
    });
  });

  it("returns unlimited limits for Serious Hobby", () => {
    expect(getTierLimits("Serious Hobby")).toEqual({
      seedLimit: null,
      aiLimit: null,
    });
  });

  it('treats "Paid" as Home Garden', () => {
    expect(getTierLimits("Paid")).toEqual({ seedLimit: 300, aiLimit: 20 });
  });

  it("falls back to Starter limits for unknown tier", () => {
    expect(getTierLimits("unknown-tier")).toEqual({
      seedLimit: 50,
      aiLimit: 50,
    });
  });
});

describe("canAddSeed", () => {
  describe("Seed Stash Starter (limit: 50)", () => {
    it("allows adding when under limit", () => {
      expect(canAddSeed(0, "Seed Stash Starter")).toBe(true);
      expect(canAddSeed(49, "Seed Stash Starter")).toBe(true);
    });

    it("blocks adding at the limit", () => {
      expect(canAddSeed(50, "Seed Stash Starter")).toBe(false);
    });

    it("blocks adding when over limit", () => {
      expect(canAddSeed(99, "Seed Stash Starter")).toBe(false);
    });
  });

  describe("Home Garden (limit: 300)", () => {
    it("allows adding when under limit", () => {
      expect(canAddSeed(299, "Home Garden")).toBe(true);
    });

    it("blocks adding at the limit", () => {
      expect(canAddSeed(300, "Home Garden")).toBe(false);
    });
  });

  describe("Serious Hobby (unlimited)", () => {
    it("always allows adding", () => {
      expect(canAddSeed(0, "Serious Hobby")).toBe(true);
      expect(canAddSeed(10_000, "Serious Hobby")).toBe(true);
    });
  });
});

describe("canUseAI", () => {
  describe("Seed Stash Starter (limit: 50/month)", () => {
    it("allows use when under limit", () => {
      expect(canUseAI(0, "Seed Stash Starter")).toBe(true);
      expect(canUseAI(49, "Seed Stash Starter")).toBe(true);
    });

    it("blocks use at the limit", () => {
      expect(canUseAI(50, "Seed Stash Starter")).toBe(false);
    });
  });

  describe("Home Garden (limit: 20/month)", () => {
    it("allows use when under limit", () => {
      expect(canUseAI(19, "Home Garden")).toBe(true);
    });

    it("blocks use at the limit", () => {
      expect(canUseAI(20, "Home Garden")).toBe(false);
    });
  });

  describe("Serious Hobby (unlimited)", () => {
    it("always allows use", () => {
      expect(canUseAI(1000, "Serious Hobby")).toBe(true);
    });
  });
});

describe("canUseAICount", () => {
  it("allows a batch that fits within the limit", () => {
    // 48 used + 2 requested = 50, limit is 50 → allowed
    expect(canUseAICount(48, "Seed Stash Starter", 2)).toBe(true);
  });

  it("blocks a batch that exceeds the limit", () => {
    // 49 used + 2 requested = 51, limit is 50 → blocked
    expect(canUseAICount(49, "Seed Stash Starter", 2)).toBe(false);
  });

  it("allows a batch that exactly hits the limit", () => {
    // 0 used + 50 requested = 50, limit is 50 → allowed
    expect(canUseAICount(0, "Seed Stash Starter", 50)).toBe(true);
  });

  it("always allows any batch for Serious Hobby", () => {
    expect(canUseAICount(0, "Serious Hobby", 999)).toBe(true);
  });
});
