import { describe, it, expect, afterEach } from 'vitest';
import { etsyApiKeyHeader } from '@/lib/etsy-listing-kit/listing-fetch';

/**
 * Etsy has required `keystring:shared_secret` in x-api-key since 2026-02-09.
 * The hub's TS routes previously sent ETSY_API_KEY bare, which 403s — the same
 * class of silent misconfiguration this change set exists to make legible.
 * The Python sync client's contract is asserted in
 * experiments/etsy-notion-sync/prototype/tests/test_etsy_api.py ("key:hush").
 */
describe('etsyApiKeyHeader', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env.ETSY_API_KEY = saved.ETSY_API_KEY;
    process.env.ETSY_SHARED_SECRET = saved.ETSY_SHARED_SECRET;
  });

  it('joins the keystring and shared secret with a colon', () => {
    process.env.ETSY_API_KEY = 'key';
    process.env.ETSY_SHARED_SECRET = 'hush';
    expect(etsyApiKeyHeader()).toBe('key:hush');
  });

  it('throws by name when the shared secret is missing, rather than sending a value that 403s', () => {
    process.env.ETSY_API_KEY = 'key';
    delete process.env.ETSY_SHARED_SECRET;
    expect(() => etsyApiKeyHeader()).toThrow(/ETSY_SHARED_SECRET is not set/);
  });

  it('throws by name when the keystring is missing', () => {
    delete process.env.ETSY_API_KEY;
    process.env.ETSY_SHARED_SECRET = 'hush';
    expect(() => etsyApiKeyHeader()).toThrow(/ETSY_API_KEY is not set/);
  });
});
