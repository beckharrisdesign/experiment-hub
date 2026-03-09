import { describe, it, expect } from 'vitest';
import { getSeedAgeYears, getViabilityStatus, isUseFirst, USE_FIRST_THRESHOLD_YEARS } from './viability';

describe('USE_FIRST_THRESHOLD_YEARS', () => {
  it('is 3', () => {
    expect(USE_FIRST_THRESHOLD_YEARS).toBe(3);
  });
});

describe('getSeedAgeYears', () => {
  it('returns undefined for undefined year', () => {
    expect(getSeedAgeYears(undefined, 2026)).toBeUndefined();
  });

  it('returns 0 for the current year', () => {
    expect(getSeedAgeYears(2026, 2026)).toBe(0);
  });

  it('returns correct age for past years', () => {
    expect(getSeedAgeYears(2023, 2026)).toBe(3);
    expect(getSeedAgeYears(2020, 2026)).toBe(6);
  });

  it('returns 1 for one year ago', () => {
    expect(getSeedAgeYears(2025, 2026)).toBe(1);
  });
});

describe('getViabilityStatus', () => {
  it('returns "unknown" when year is undefined', () => {
    expect(getViabilityStatus(undefined, 2026)).toBe('unknown');
  });

  it('returns "good" for seeds packed this year', () => {
    expect(getViabilityStatus(2026, 2026)).toBe('good');
  });

  it('returns "good" for 1-year-old seeds', () => {
    expect(getViabilityStatus(2025, 2026)).toBe('good');
  });

  it('returns "watch" for 2-year-old seeds', () => {
    expect(getViabilityStatus(2024, 2026)).toBe('watch');
  });

  it('returns "use-first" at the threshold (3 years)', () => {
    expect(getViabilityStatus(2023, 2026)).toBe('use-first');
  });

  it('returns "use-first" for seeds older than the threshold', () => {
    expect(getViabilityStatus(2019, 2026)).toBe('use-first');
  });
});

describe('isUseFirst', () => {
  it('returns false for undefined year', () => {
    expect(isUseFirst(undefined, 2026)).toBe(false);
  });

  it('returns false for seeds under the threshold', () => {
    expect(isUseFirst(2025, 2026)).toBe(false);
    expect(isUseFirst(2024, 2026)).toBe(false);
  });

  it('returns true at the threshold', () => {
    expect(isUseFirst(2023, 2026)).toBe(true);
  });

  it('returns true for old seeds', () => {
    expect(isUseFirst(2018, 2026)).toBe(true);
  });
});
