import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capture what the route persists — the PII check (QA 4.2) is that the
// stored row carries listing data only, never buyer/account fields.
const { insert } = vi.hoisted(() => ({ insert: vi.fn() }));
vi.mock('@/lib/etsy-listing-kit/supabase-admin', () => ({
  createAdminSupabaseClient: () => ({
    from: () => ({ insert: insert.mockReturnValue({ then: (cb: (r: { error: null }) => void) => cb({ error: null }) }) }),
  }),
}));

import { POST } from '@/app/etsy-listing-kit/api/evaluate/route';

// Distinct IP per test — the route's per-IP throttle is module-scoped and
// survives between tests in this file.
let ipSeq = 0;
function req(url: string, ip?: string) {
  return {
    json: async () => ({ url }),
    headers: new Headers({ 'x-forwarded-for': ip ?? `10.0.0.${++ipSeq}` }),
  } as never;
}

beforeEach(() => insert.mockClear());

describe('POST /etsy-listing-kit/api/evaluate (fixture mode)', () => {
  it('evaluates a fixture listing and persists listing data only — no PII', async () => {
    const res = await POST(req('https://www.etsy.com/listing/4522917501/x?ref=shop_home'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.kind).toBe('evaluation');
    expect(json.evaluation.listingId).toBe(4522917501);
    // spec: evaluation events/rows carry listing id, never buyer or account data
    expect(insert).toHaveBeenCalledTimes(1);
    const row = insert.mock.calls[0][0];
    expect(Object.keys(row).sort()).toEqual(
      ['listing_id', 'recommendation_keys', 'recommended_in_use', 'required_pass', 'state'].sort(),
    );
  });

  it('suggests a shop’s featured listing without scoring anything', async () => {
    const res = await POST(req('https://www.etsy.com/shop/WatermarkandHue'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.kind).toBe('shop_suggestion');
    expect(json.suggestion.listingId).toBe(4465357735);
    expect(insert).not.toHaveBeenCalled(); // nothing scored until confirmed
  });

  it('fails junk honestly — plain reason, nothing scored, nothing stored', async () => {
    const res = await POST(req('https://example.com/not-etsy'));
    expect(res.status).toBe(422);
    expect((await res.json()).reason).toMatch(/not an Etsy link/i);
    expect(insert).not.toHaveBeenCalled();
  });

  it('404s an unknown listing with an honest reason', async () => {
    const res = await POST(req('https://www.etsy.com/listing/123/x'));
    expect(res.status).toBe(404);
    expect((await res.json()).reason).toMatch(/couldn’t read that listing/i);
  });

  it('serves repeat checks of the same listing from the cache within TTL (QA 4.4)', async () => {
    const a = await (await POST(req('https://www.etsy.com/listing/4465357735/x'))).json();
    const b = await (await POST(req('https://www.etsy.com/listing/4465357735/y?ref=z'))).json();
    // a fresh evaluation would carry a new fetchedAt — identical means cached
    expect(b.evaluation.fetchedAt).toBe(a.evaluation.fetchedAt);
  });

  it('throttles a single IP after 5 checks in the window (QA 4.4)', async () => {
    const ip = '203.0.113.99';
    let last = 0;
    for (let i = 0; i < 6; i++) {
      last = (await POST(req(`https://www.etsy.com/listing/4522917501/x`, ip))).status;
    }
    expect(last).toBe(429);
  });
});
