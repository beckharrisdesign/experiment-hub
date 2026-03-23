import { describe, it, expect, vi } from 'vitest';
import { getFirstOfNextMonth, getSubscriptionInfo } from './tier';

// Build a minimal Supabase mock that satisfies the chained query in getSubscriptionInfo:
// supabase.from(...).select(...).eq(...).maybeSingle()
function makeSupabaseMock(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  return { from: vi.fn().mockReturnValue(chain) };
}

const USER_ID = 'user-123';

describe('getFirstOfNextMonth', () => {
  it('returns a valid ISO date string', () => {
    const result = getFirstOfNextMonth();
    expect(() => new Date(result)).not.toThrow();
    expect(new Date(result).toISOString()).toBe(result);
  });

  it('always returns the 1st of a month', () => {
    const date = new Date(getFirstOfNextMonth());
    expect(date.getUTCDate()).toBe(1);
  });

  it('returns a date in the future', () => {
    expect(new Date(getFirstOfNextMonth()).getTime()).toBeGreaterThan(Date.now());
  });

  it('rolls over to January when called in December', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-12-15T12:00:00Z'));
      const result = getFirstOfNextMonth();
      const date = new Date(result);
      expect(date.getFullYear()).toBe(2027);
      expect(date.getMonth()).toBe(0); // January
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('getSubscriptionInfo', () => {
  it('returns the DB tier when subscription is active', async () => {
    const supabase = makeSupabaseMock({
      data: {
        tier: 'Home Garden',
        status: 'active',
        current_period_end: '2026-04-01T00:00:00Z',
        cancel_at_period_end: false,
        stripe_customer_id: 'cus_123',
      },
      error: null,
    });

    const result = await getSubscriptionInfo(USER_ID, supabase as never);
    expect(result.tier).toBe('Home Garden');
    expect(result.status).toBe('active');
    expect(result.stripeCustomerId).toBe('cus_123');
    expect(result.cancelAtPeriodEnd).toBe(false);
  });

  it('returns the DB tier when subscription is trialing', async () => {
    const supabase = makeSupabaseMock({
      data: {
        tier: 'Serious Hobby',
        status: 'trialing',
        current_period_end: '2026-04-01T00:00:00Z',
        cancel_at_period_end: false,
        stripe_customer_id: 'cus_456',
      },
      error: null,
    });

    const result = await getSubscriptionInfo(USER_ID, supabase as never);
    expect(result.tier).toBe('Serious Hobby');
    expect(result.status).toBe('trialing');
  });

  it('downgrades to Starter when subscription is canceled', async () => {
    const supabase = makeSupabaseMock({
      data: {
        tier: 'Home Garden',
        status: 'canceled',
        current_period_end: '2026-02-01T00:00:00Z',
        cancel_at_period_end: false,
        stripe_customer_id: 'cus_789',
      },
      error: null,
    });

    const result = await getSubscriptionInfo(USER_ID, supabase as never);
    expect(result.tier).toBe('Seed Stash Starter');
    expect(result.status).toBe('canceled');
  });

  it('downgrades to Starter when subscription is past_due', async () => {
    const supabase = makeSupabaseMock({
      data: {
        tier: 'Serious Hobby',
        status: 'past_due',
        current_period_end: null,
        cancel_at_period_end: false,
        stripe_customer_id: null,
      },
      error: null,
    });

    const result = await getSubscriptionInfo(USER_ID, supabase as never);
    expect(result.tier).toBe('Seed Stash Starter');
  });

  it('returns free tier when no DB row exists and no Stripe key is set', async () => {
    // No row in DB (data: null), no STRIPE_SECRET_KEY in test env → FREE_INFO
    const supabase = makeSupabaseMock({ data: null, error: null });

    const result = await getSubscriptionInfo(USER_ID, supabase as never);
    expect(result.tier).toBe('Seed Stash Starter');
    expect(result.status).toBe('free');
    expect(result.stripeCustomerId).toBeNull();
  });

  it('returns free tier when the DB query errors', async () => {
    const supabase = makeSupabaseMock({ data: null, error: { message: 'connection refused' } });

    const result = await getSubscriptionInfo(USER_ID, supabase as never);
    expect(result.tier).toBe('Seed Stash Starter');
    expect(result.status).toBe('free');
  });
});
