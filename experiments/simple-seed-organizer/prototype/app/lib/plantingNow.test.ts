import { describe, it, expect } from 'vitest';
import { daysFromToday, isActionableNow, isActionableUpcoming, groupByAction } from './plantingNow';

const today = new Date('2026-03-08');

describe('daysFromToday', () => {
  it('returns 0 for today', () => {
    expect(daysFromToday(new Date('2026-03-08'), today)).toBe(0);
  });

  it('returns positive for future dates', () => {
    expect(daysFromToday(new Date('2026-03-15'), today)).toBe(7);
  });

  it('returns negative for past dates', () => {
    expect(daysFromToday(new Date('2026-03-01'), today)).toBe(-7);
  });
});

describe('isActionableNow', () => {
  it('is true for a date today', () => {
    expect(isActionableNow(new Date('2026-03-08'), today)).toBe(true);
  });

  it('is true for a date 14 days in the future', () => {
    expect(isActionableNow(new Date('2026-03-22'), today)).toBe(true);
  });

  it('is true for a date 7 days in the past (grace period)', () => {
    expect(isActionableNow(new Date('2026-03-01'), today)).toBe(true);
  });

  it('is false for a date 15 days in the future', () => {
    expect(isActionableNow(new Date('2026-03-23'), today)).toBe(false);
  });

  it('is false for a date 8 days in the past', () => {
    expect(isActionableNow(new Date('2026-02-28'), today)).toBe(false);
  });
});

describe('isActionableUpcoming', () => {
  it('is true for a date 15 days in the future', () => {
    expect(isActionableUpcoming(new Date('2026-03-23'), today)).toBe(true);
  });

  it('is true for a date 28 days in the future', () => {
    expect(isActionableUpcoming(new Date('2026-04-05'), today)).toBe(true);
  });

  it('is false for a date 14 days in the future (that is "now")', () => {
    expect(isActionableUpcoming(new Date('2026-03-22'), today)).toBe(false);
  });

  it('is false for a date 29 days in the future', () => {
    expect(isActionableUpcoming(new Date('2026-04-06'), today)).toBe(false);
  });

  it('is false for a past date', () => {
    expect(isActionableUpcoming(new Date('2026-03-01'), today)).toBe(false);
  });
});

describe('groupByAction', () => {
  it('groups items by action label', () => {
    const items = [
      { seed: { name: 'Tomato', variety: 'Black Krim' } as any, action: 'startIndoors' as const, date: new Date() },
      { seed: { name: 'Pepper', variety: 'Shishito' } as any, action: 'startIndoors' as const, date: new Date() },
      { seed: { name: 'Spinach', variety: 'Bloomsdale' } as any, action: 'directSow' as const, date: new Date() },
    ];
    const groups = groupByAction(items);
    expect(groups).toHaveLength(2);
    const indoor = groups.find(g => g.action === 'startIndoors');
    expect(indoor?.seeds).toHaveLength(2);
    const direct = groups.find(g => g.action === 'directSow');
    expect(direct?.seeds).toHaveLength(1);
  });

  it('returns empty array for no items', () => {
    expect(groupByAction([])).toHaveLength(0);
  });
});
