import { describe, it, expect } from "vitest";
import { canAddSeed, canUseAI, canUseAICount, getTierLimits } from "./limits";

// Tier defaults: Starter={seeds:50, ai:10} | Home Garden={seeds:unlimited, ai:100}

describe("getTierLimits", () => {
  it("returns correct limits for Seed Stash Starter", () => {
    expect(getTierLimits("Seed Stash Starter")).toEqual({
      seedLimit: 50,
      aiLimit: 10,
    });
  });

  it("returns correct limits for Home Garden (unlimited seeds, capped AI)", () => {
    expect(getTierLimits("Home Garden")).toEqual({
      seedLimit: null,
      aiLimit: 100,
    });
  });

  it('treats "Paid" as Home Garden', () => {
    expect(getTierLimits("Paid")).toEqual({ seedLimit: null, aiLimit: 100 });
  });

  it("falls back to Starter limits for unknown tier", () => {
    expect(getTierLimits("unknown-tier")).toEqual({
      seedLimit: 50,
      aiLimit: 10,
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

  describe("Home Garden (unlimited seeds)", () => {
    it("always allows adding", () => {
      expect(canAddSeed(0, "Home Garden")).toBe(true);
      expect(canAddSeed(10_000, "Home Garden")).toBe(true);
    });
  });
});

describe("canUseAI", () => {
  describe("Seed Stash Starter (limit: 10/month)", () => {
    it("allows use when under limit", () => {
      expect(canUseAI(0, "Seed Stash Starter")).toBe(true);
      expect(canUseAI(9, "Seed Stash Starter")).toBe(true);
    });

    it("blocks use at the limit", () => {
      expect(canUseAI(10, "Seed Stash Starter")).toBe(false);
    });
  });

  describe("Home Garden (limit: 100/month)", () => {
    it("allows use when under limit", () => {
      expect(canUseAI(99, "Home Garden")).toBe(true);
    });

    it("blocks use at the limit", () => {
      expect(canUseAI(100, "Home Garden")).toBe(false);
    });
  });
});

describe("canUseAICount", () => {
  it("allows a batch that fits within the limit", () => {
    // 8 used + 2 requested = 10, limit is 10 → allowed
    expect(canUseAICount(8, "Seed Stash Starter", 2)).toBe(true);
  });

  it("blocks a batch that exceeds the limit", () => {
    // 9 used + 2 requested = 11, limit is 10 → blocked
    expect(canUseAICount(9, "Seed Stash Starter", 2)).toBe(false);
  });

  it("allows a batch that exactly hits the limit", () => {
    // 0 used + 10 requested = 10, limit is 10 → allowed
    expect(canUseAICount(0, "Seed Stash Starter", 10)).toBe(true);
  });

  it("allows a large batch within the Home Garden limit", () => {
    expect(canUseAICount(0, "Home Garden", 100)).toBe(true);
    expect(canUseAICount(0, "Home Garden", 101)).toBe(false);
  });
});
