import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import {
  parseEtsyUrl,
  evaluateListing,
  type EvaluationResult,
  type RawApiListing,
} from '../../../../lib/etsy-listing-kit/evaluate';
import { createAdminSupabaseClient } from '../../../../lib/etsy-listing-kit/supabase-admin';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /etsy-listing-kit/api/evaluate
 * Body: { url: string }
 *
 * Evaluates one public Etsy listing against the shared rubric
 * (lib/etsy-scorecard.ts). Shop links return the shop's featured listing as a
 * suggestion to confirm — nothing is scored until the visitor confirms
 * (design decision 8). Unusable URLs fail honestly; nothing is stored.
 *
 * Rate-limit posture (design decision 7): per-listing cache + per-IP throttle,
 * official v3 API only, existing app key. Dev/test never call Etsy — set
 * ELK_EVAL_FIXTURES=1 to serve the checked-in W&H snapshots.
 *
 * Cache/throttle are per server instance (module scope). On serverless that
 * means per-warm-instance — acceptable insurance, not a global guarantee.
 */

const CACHE_TTL_MS = 10 * 60 * 1000;
const THROTTLE_WINDOW_MS = 60 * 1000;
const THROTTLE_MAX = 5;

const cache = new Map<number, { at: number; result: unknown }>();
const hits = new Map<string, number[]>();

function throttled(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < THROTTLE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > THROTTLE_MAX;
}

const FIXTURES: Record<number, string> = {
  4522917501: 'keychain-4522917501.json',
  4465357735: 'floral-4465357735.json',
  9990000001: 'synthetic-fully-built.json',
};

function fixturesEnabled(): boolean {
  return process.env.ELK_EVAL_FIXTURES === '1' || !process.env.ETSY_API_KEY;
}

async function loadFixture(listingId: number): Promise<RawApiListing | null> {
  const file = FIXTURES[listingId];
  if (!file) return null;
  const p = path.join(process.cwd(), 'lib', 'etsy-listing-kit', 'fixtures', file);
  return JSON.parse(await readFile(p, 'utf8')) as RawApiListing;
}

async function fetchListing(listingId: number): Promise<RawApiListing | null> {
  if (fixturesEnabled()) return loadFixture(listingId);
  const key = process.env.ETSY_API_KEY!;
  const res = await fetch(
    `https://api.etsy.com/v3/application/listings/${listingId}?includes=Images,Videos`,
    { headers: { 'x-api-key': key } },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Etsy API ${res.status}`);
  return (await res.json()) as RawApiListing;
}

interface ShopSuggestion {
  listingId: number;
  title: string;
  imageUrl: string | null;
  shopName: string;
}

async function suggestFromShop(shopSlug: string): Promise<ShopSuggestion | null> {
  if (fixturesEnabled()) {
    // Fixture behavior mirrors the live shape: W&H's featured listing.
    const raw = await loadFixture(4465357735);
    if (!raw) return null;
    return {
      listingId: raw.listing_id,
      title: raw.title ?? '',
      imageUrl: raw.images?.[0]?.url_570xN ?? null,
      shopName: shopSlug,
    };
  }
  const key = process.env.ETSY_API_KEY!;
  const headers = { 'x-api-key': key };
  const shopRes = await fetch(
    `https://api.etsy.com/v3/application/shops?shop_name=${encodeURIComponent(shopSlug)}&limit=1`,
    { headers },
  );
  if (!shopRes.ok) return null;
  const shops = (await shopRes.json()) as { results?: Array<{ shop_id: number; shop_name: string }> };
  const shop = shops.results?.[0];
  if (!shop) return null;
  // Featured first; fall back to the first active listing.
  for (const segment of ['listings/featured', 'listings/active']) {
    const res = await fetch(
      `https://api.etsy.com/v3/application/shops/${shop.shop_id}/${segment}?limit=1&includes=Images`,
      { headers },
    );
    if (!res.ok) continue;
    const body = (await res.json()) as { results?: RawApiListing[] };
    const listing = body.results?.[0];
    if (listing) {
      return {
        listingId: listing.listing_id,
        title: listing.title ?? '',
        imageUrl: listing.images?.[0]?.url_570xN ?? null,
        shopName: shop.shop_name,
      };
    }
  }
  return null;
}

/** Fire-and-forget persistence (migration 013); a failed insert never blocks the response. */
function persistEvaluation(evaluation: EvaluationResult): void {
  const db = createAdminSupabaseClient();
  if (!db) return;
  void db
    .from('elk_evaluations')
    .insert({
      listing_id: evaluation.listingId,
      required_pass: evaluation.requiredPass,
      recommended_in_use: evaluation.recommendedInUse,
      state: evaluation.state,
      recommendation_keys: evaluation.recommendations.map((r) => r.key),
    })
    .then(({ error }) => {
      if (error) console.error('elk_evaluations insert failed:', error.message);
    });
}

export async function POST(request: NextRequest) {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected JSON with a url.' }, { status: 400 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (throttled(ip)) {
    return NextResponse.json(
      { error: 'A few too many checks at once — give it a minute and try again.' },
      { status: 429 },
    );
  }

  const parsed = parseEtsyUrl(body.url ?? '');

  if (parsed.kind === 'invalid') {
    // Fail honestly: plain-language reason, nothing scored, nothing stored.
    return NextResponse.json({ kind: 'invalid', reason: parsed.reason }, { status: 422 });
  }

  if (parsed.kind === 'shop') {
    try {
      const suggestion = await suggestFromShop(parsed.shopSlug);
      if (!suggestion) {
        return NextResponse.json(
          { kind: 'invalid', reason: 'We couldn’t read that shop — paste one listing’s URL instead.' },
          { status: 422 },
        );
      }
      return NextResponse.json({ kind: 'shop_suggestion', suggestion });
    } catch {
      return NextResponse.json(
        { kind: 'invalid', reason: 'We couldn’t read that shop right now — paste one listing’s URL instead.' },
        { status: 502 },
      );
    }
  }

  const cached = cache.get(parsed.listingId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return NextResponse.json(cached.result);
  }

  try {
    const raw = await fetchListing(parsed.listingId);
    if (!raw) {
      return NextResponse.json(
        {
          kind: 'invalid',
          reason: 'We couldn’t read that listing — it may be inactive or private. Nothing was scored.',
        },
        { status: 404 },
      );
    }
    const evaluation = evaluateListing(raw);
    const result = { kind: 'evaluation', evaluation };
    cache.set(parsed.listingId, { at: Date.now(), result });
    persistEvaluation(evaluation);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { kind: 'invalid', reason: 'We couldn’t read that listing right now. Nothing was scored.' },
      { status: 502 },
    );
  }
}
