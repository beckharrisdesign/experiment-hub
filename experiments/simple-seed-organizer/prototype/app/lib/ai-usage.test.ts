import { describe, it, expect, vi } from 'vitest';
import { getCurrentPeriod, getAiUsage } from './ai-usage';

// Build a minimal Supabase mock for the chained query in getAiUsage:
// supabase.from(...).select(...).eq(...).eq(...).maybeSingle()
function makeSupabaseMock(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  return { from: vi.fn().mockReturnValue(chain) };
}

const USER_ID = 'user-abc';

describe('getCurrentPeriod', () => {
  it('returns a string in YYYY-MM format', () => {
    const period = getCurrentPeriod();
    expect(period).toMatch(/^\d{4}-\d{2}$/);
  });

  it('matches the current year and month', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-03-15T10:00:00Z'));
      expect(getCurrentPeriod()).toBe('2026-03');
    } finally {
      vi.useRealTimers();
    }
  });

  it('zero-pads single-digit months', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-07-01T00:00:00Z'));
      expect(getCurrentPeriod()).toBe('2026-07');
    } finally {
      vi.useRealTimers();
    }
  });

  it('handles year rollover correctly', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-12-31T23:59:59Z'));
      expect(getCurrentPeriod()).toBe('2026-12');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('getAiUsage', () => {
  it('returns the completions count when a row exists', async () => {
    const supabase = makeSupabaseMock({ data: { completions: 7 }, error: null });
    const count = await getAiUsage(supabase as never, USER_ID);
    expect(count).toBe(7);
  });

  it('returns 0 when no row exists for the period', async () => {
    const supabase = makeSupabaseMock({ data: null, error: null });
    const count = await getAiUsage(supabase as never, USER_ID);
    expect(count).toBe(0);
  });

  it('returns 0 gracefully on a Supabase error', async () => {
    const supabase = makeSupabaseMock({ data: null, error: { message: 'timeout' } });
    const count = await getAiUsage(supabase as never, USER_ID);
    expect(count).toBe(0);
  });

  it('accepts an explicit period override', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { completions: 3 }, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(chain) };

    await getAiUsage(supabase as never, USER_ID, '2025-11');

    // Verify the period arg was passed through to the second .eq() call
    expect(chain.eq).toHaveBeenCalledWith('period', '2025-11');
  });
});
