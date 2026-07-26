import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sendResultEmail, resultEmailHtml, resultEmailText } from '@/lib/etsy-listing-kit/email';

describe('email content', () => {
  it('includes the download url in html and text', () => {
    const url = 'https://example.com/etsy-listing-kit/result?order=abc';
    expect(resultEmailHtml(url)).toContain(url);
    expect(resultEmailText(url)).toContain(url);
    expect(resultEmailHtml(url)).toContain('your photos are ready');
  });
});

describe('sendResultEmail — no provider', () => {
  const saved = process.env.RESEND_API_KEY;
  beforeEach(() => { delete process.env.RESEND_API_KEY; });
  afterEach(() => { if (saved) process.env.RESEND_API_KEY = saved; });

  it('is a safe no-op when no provider is configured (never throws, reports unsent)', async () => {
    const r = await sendResultEmail('seller@example.com', 'https://example.com/dl');
    expect(r).toEqual({ sent: false, id: null, reason: 'no-provider' });
  });
});
