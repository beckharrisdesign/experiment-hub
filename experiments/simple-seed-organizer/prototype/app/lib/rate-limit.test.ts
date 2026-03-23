import { describe, it, expect, vi } from 'vitest';
import { rateLimit, getClientIp } from './rate-limit';

// Each test gets a unique key so module-level window state never bleeds between tests.
let keyIndex = 0;
const freshKey = () => `test-${keyIndex++}`;

describe('rateLimit', () => {
  it('allows the first request', () => {
    const result = rateLimit(freshKey(), { windowMs: 60_000, max: 5 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('decrements remaining with each request', () => {
    const key = freshKey();
    const opts = { windowMs: 60_000, max: 5 };
    rateLimit(key, opts);
    rateLimit(key, opts);
    const result = rateLimit(key, opts);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('blocks when the limit is exceeded', () => {
    const key = freshKey();
    const opts = { windowMs: 60_000, max: 3 };
    rateLimit(key, opts);
    rateLimit(key, opts);
    rateLimit(key, opts);
    const result = rateLimit(key, opts); // 4th request — over limit
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('includes retryAfter (in seconds) when blocked', () => {
    const key = freshKey();
    const opts = { windowMs: 60_000, max: 1 };
    rateLimit(key, opts);
    const result = rateLimit(key, opts);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
    expect(result.retryAfter).toBeLessThanOrEqual(60);
  });

  it('tracks different keys independently', () => {
    const k1 = freshKey();
    const k2 = freshKey();
    const opts = { windowMs: 60_000, max: 1 };
    rateLimit(k1, opts);
    rateLimit(k1, opts); // k1 is now over limit
    const result = rateLimit(k2, opts); // k2 is a fresh key
    expect(result.allowed).toBe(true);
  });

  it('resets after the window expires', () => {
    vi.useFakeTimers();
    try {
      const key = freshKey();
      const opts = { windowMs: 1_000, max: 2 };
      rateLimit(key, opts);
      rateLimit(key, opts);
      expect(rateLimit(key, opts).allowed).toBe(false); // over limit

      vi.advanceTimersByTime(1_001); // past the window

      const result = rateLimit(key, opts); // should be a fresh window
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('getClientIp', () => {
  it('returns the first IP from x-forwarded-for', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-real-ip': '9.10.11.12' },
    });
    expect(getClientIp(req)).toBe('9.10.11.12');
  });

  it('returns "unknown" when no IP headers are present', () => {
    const req = new Request('http://localhost');
    expect(getClientIp(req)).toBe('unknown');
  });
});
