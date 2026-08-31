import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sendResultEmail, resultEmailHtml, resultEmailText, refundEmailHtml } from '@/lib/etsy-listing-kit/email';

describe('email content', () => {
  it('includes the download url in html and text', () => {
    const url = 'https://example.com/etsy-listing-kit/result?order=abc';
    expect(resultEmailHtml(url)).toContain(url);
    expect(resultEmailText(url)).toContain(url);
    expect(resultEmailHtml(url)).toContain('photos are ready');
  });

  it('carries the funnel branding so buyers recognise the sender', () => {
    const html = resultEmailHtml('https://example.com/dl');
    expect(html).toContain('Etsy Listing Kit');          // masthead wordmark
    expect(html).toContain('#b24a2e');                   // terracotta CTA
    expect(html).toContain('#d99a2b');                   // ochre accent rule
    expect(html).toContain('Beck Harris Design');        // footer attribution
    expect(html).toContain('WHAT&rsquo;S IN YOUR SET');  // product recap
  });

  it('brands the refund email from the same shell', () => {
    const html = refundEmailHtml();
    expect(html).toContain('Etsy Listing Kit');
    expect(html).toContain('Beck Harris Design');
    expect(html).toContain('refunded you in full');
  });

  it('names the sender and reason in the plain-text part too', () => {
    const text = resultEmailText('https://example.com/dl');
    expect(text).toContain('ETSY LISTING KIT');
    expect(text).toContain('Beck Harris Design');
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

describe('reply-to routing', () => {
  // The sending subdomain receives no mail, so "just reply to this email"
  // only works if a Reply-To is attached.
  const savedKey = process.env.RESEND_API_KEY;
  const savedReply = process.env.ELK_REPLY_TO;
  afterEach(() => {
    vi.unstubAllGlobals();
    // Restore on `undefined`, not falsiness — an env var legitimately set to
    // "" must be restored as "", or the suite becomes order-dependent.
    if (savedKey !== undefined) process.env.RESEND_API_KEY = savedKey; else delete process.env.RESEND_API_KEY;
    if (savedReply !== undefined) process.env.ELK_REPLY_TO = savedReply; else delete process.env.ELK_REPLY_TO;
    vi.resetModules();
  });

  async function sendWith(replyTo?: string) {
    process.env.RESEND_API_KEY = 'test-key';
    if (replyTo) process.env.ELK_REPLY_TO = replyTo; else delete process.env.ELK_REPLY_TO;
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 're_1' }) });
    vi.stubGlobal('fetch', fetchMock);
    vi.resetModules();
    const mod = await import('@/lib/etsy-listing-kit/email');
    await mod.sendResultEmail('buyer@example.com', 'https://example.com/dl');
    return JSON.parse(fetchMock.mock.calls[0][1].body as string);
  }

  it('attaches reply_to when ELK_REPLY_TO is set', async () => {
    const body = await sendWith('katy@example.com');
    expect(body.reply_to).toBe('katy@example.com');
  });

  it('omits reply_to entirely when unset (no empty header)', async () => {
    const body = await sendWith();
    expect('reply_to' in body).toBe(false);
  });
});
