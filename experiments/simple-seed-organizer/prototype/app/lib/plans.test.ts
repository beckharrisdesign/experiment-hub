import { describe, it, expect } from 'vitest';
import {
  PLANS,
  TIER_ORDER,
  getTierIndex,
  getUpgradeTiers,
  getDowngradeTiers,
  buildPriceToTierMap,
} from './plans';

describe('TIER_ORDER', () => {
  it('has three tiers in ascending order', () => {
    expect(TIER_ORDER).toEqual(['Seed Stash Starter', 'Home Garden', 'Serious Hobby']);
  });
});

describe('PLANS', () => {
  it('has one entry per tier', () => {
    expect(PLANS).toHaveLength(3);
    expect(PLANS.map(p => p.id)).toEqual([...TIER_ORDER]);
  });

  it('Starter tier is free', () => {
    const starter = PLANS.find(p => p.id === 'Seed Stash Starter')!;
    expect(starter.monthlyPrice).toBe('Free');
    expect(starter.yearlyPrice).toBe('Free');
  });

  it('paid tiers have non-empty prices', () => {
    const paid = PLANS.filter(p => p.id !== 'Seed Stash Starter');
    for (const plan of paid) {
      expect(plan.monthlyPrice).toBeTruthy();
      expect(plan.yearlyPrice).toBeTruthy();
    }
  });
});

describe('getTierIndex', () => {
  it('returns 0 for Seed Stash Starter', () => {
    expect(getTierIndex('Seed Stash Starter')).toBe(0);
  });

  it('returns 1 for Home Garden', () => {
    expect(getTierIndex('Home Garden')).toBe(1);
  });

  it('returns 2 for Serious Hobby', () => {
    expect(getTierIndex('Serious Hobby')).toBe(2);
  });

  it('returns 0 for an unknown tier', () => {
    expect(getTierIndex('unknown-tier')).toBe(0);
    expect(getTierIndex('')).toBe(0);
  });
});

describe('getUpgradeTiers', () => {
  it('returns 2 upgrade options from Starter', () => {
    const upgrades = getUpgradeTiers('Seed Stash Starter');
    expect(upgrades).toHaveLength(2);
    expect(upgrades[0].id).toBe('Home Garden');
    expect(upgrades[1].id).toBe('Serious Hobby');
  });

  it('returns 1 upgrade option from Home Garden', () => {
    const upgrades = getUpgradeTiers('Home Garden');
    expect(upgrades).toHaveLength(1);
    expect(upgrades[0].id).toBe('Serious Hobby');
  });

  it('returns no upgrades from the top tier', () => {
    expect(getUpgradeTiers('Serious Hobby')).toHaveLength(0);
  });

  it('treats an unknown tier as Starter (index 0)', () => {
    expect(getUpgradeTiers('unknown')).toHaveLength(2);
  });
});

describe('getDowngradeTiers', () => {
  it('returns no downgrades from Starter', () => {
    expect(getDowngradeTiers('Seed Stash Starter')).toHaveLength(0);
  });

  it('returns 1 downgrade option from Home Garden', () => {
    const downgrades = getDowngradeTiers('Home Garden');
    expect(downgrades).toHaveLength(1);
    expect(downgrades[0].id).toBe('Seed Stash Starter');
  });

  it('returns 2 downgrade options from Serious Hobby', () => {
    const downgrades = getDowngradeTiers('Serious Hobby');
    expect(downgrades).toHaveLength(2);
    expect(downgrades[0].id).toBe('Seed Stash Starter');
    expect(downgrades[1].id).toBe('Home Garden');
  });
});

describe('buildPriceToTierMap', () => {
  it('returns an object', () => {
    expect(typeof buildPriceToTierMap()).toBe('object');
  });

  it('returns an empty map when Stripe env vars are not set', () => {
    // In CI, NEXT_PUBLIC_STRIPE_PRICE_* are not set — the map should be empty
    // (not undefined, not throw) so callers get a safe default.
    const map = buildPriceToTierMap();
    const keys = Object.keys(map).filter(k => k !== 'undefined');
    expect(keys).toHaveLength(0);
  });
});
