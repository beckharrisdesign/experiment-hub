import { NextRequest, NextResponse } from "next/server";
import { deferCost, saleIdOf } from "../../../../lib/estate-sale-planner/costs";
import { lookupComps, type LookupItem } from "../../../../lib/estate-sale-planner/comps/lookup";
import { providerFromEnv } from "../../../../lib/estate-sale-planner/comps/provider";
import { messageOf } from "../../../../lib/estate-sale-planner/errors";
import { DESTINATIONS } from "../../../../lib/estate-sale-planner/session";
import { createAdminSupabaseClient } from "../../../../lib/estate-sale-planner/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /estate-sale-planner/api/comps
 * Body: { item: { name, band, destination, markReading?, note?, lotCount? }, minBand?, saleId? }
 *
 * The sold-price lookup (sold-comps design D4). Returns `{ success: true, ...CompsSummary }`; a
 * lookup that can't run is still a success with its status ("gated", "not-configured",
 * "quota", "error"), because the item simply keeps its band.
 *
 * What bounds spend, honestly, while there are no accounts:
 * - The server re-checks the gate (Sell, band at or above the threshold), but the threshold
 *   comes from the device. `resolveLookupMinBand` only keeps it to an offered choice, so the
 *   floor the server enforces is the lowest choice ($25), not this person's own setting. That
 *   moves to the person's row when sign-in lands (review queue #50).
 * - Per-address and per-instance rate limits below.
 * - The provider plan: CompsAPI pauses at its monthly quota and has no overage, so the worst
 *   case is the plan price.
 */

const WINDOW_MS = 60_000;
const PER_CLIENT = 12;
/** Across every caller on this instance, so rotating addresses can't get past it. */
const PER_INSTANCE = 60;
/** Past this many tracked addresses, expired ones are dropped; the map never grows without bound. */
const MAX_TRACKED = 500;

const hits = new Map<string, number[]>();
let instanceHits: number[] = [];

function throttled(client: string, now = Date.now()): boolean {
  instanceHits = instanceHits.filter((t) => now - t < WINDOW_MS);
  if (hits.size > MAX_TRACKED) {
    for (const [key, times] of hits) if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    // Still full of live entries: forget the oldest-inserted ones.
    for (const key of hits.keys()) {
      if (hits.size <= MAX_TRACKED) break;
      hits.delete(key);
    }
  }
  const recent = (hits.get(client) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(client, recent);
  instanceHits.push(now);
  return recent.length > PER_CLIENT || instanceHits.length > PER_INSTANCE;
}

/** Vercel sets `x-real-ip` (and overwrites `x-forwarded-for`) at its edge, so neither is the caller's to choose there. */
function clientOf(request: NextRequest): string {
  return request.headers.get("x-real-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

const short = (v: unknown, max: number) => v === undefined || v === null || (typeof v === "string" && v.length <= max);

function validItem(i: unknown): i is LookupItem {
  if (!i || typeof i !== "object") return false;
  const o = i as Record<string, unknown>;
  return (
    typeof o.name === "string" && o.name.trim().length > 0 && o.name.length <= 200 &&
    typeof o.band === "string" && o.band.length <= 40 &&
    (o.destination === undefined || (DESTINATIONS as readonly unknown[]).includes(o.destination)) &&
    short(o.markReading, 200) && short(o.note, 2000) &&
    (o.lotCount === undefined || (Number.isInteger(o.lotCount) && (o.lotCount as number) > 0 && (o.lotCount as number) <= 100))
  );
}

export async function POST(request: NextRequest) {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON with an item." }, { status: 400 });
  }
  // `null` and arrays are valid JSON too.
  const body = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as { item?: unknown; minBand?: unknown; saleId?: unknown }) : null;
  if (!body || !validItem(body.item)) {
    return NextResponse.json({ error: "Send the item's name, band and destination." }, { status: 400 });
  }

  if (throttled(clientOf(request))) {
    return NextResponse.json({ error: "A few too many lookups at once — give it a minute." }, { status: 429 });
  }

  try {
    const { name, band, destination, markReading, note, lotCount } = body.item;
    const summary = await lookupComps(
      { item: { name, band, destination, markReading, note, lotCount }, minBand: body.minBand, saleId: saleIdOf(body.saleId) },
      { provider: providerFromEnv(), db: createAdminSupabaseClient(), record: deferCost },
    );
    if (summary.status !== "gated") {
      console.info(`[esp comps] ${summary.status}${summary.cached ? " (cached)" : ""}${summary.matched !== undefined ? `, ${summary.matched}/${summary.found} matched` : ""}`);
    }
    return NextResponse.json({ success: true, ...summary });
  } catch (error: unknown) {
    console.error("[esp comps] lookup failed:", error);
    return NextResponse.json({ error: `The sold-price lookup didn't come back: ${messageOf(error).slice(0, 200)}` }, { status: 502 });
  }
}
