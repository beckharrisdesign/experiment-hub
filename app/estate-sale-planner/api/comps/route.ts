import { NextRequest, NextResponse } from "next/server";
import { deferCost, saleIdOf } from "../../../../lib/estate-sale-planner/costs";
import { getLatestCheck, nextCheckAt, checkAllowed, saveCheck, type CheckGiven, type CompsCheck } from "../../../../lib/estate-sale-planner/comps/check";
import { lookupComps, type LookupItem } from "../../../../lib/estate-sale-planner/comps/lookup";
import { providerFromEnv } from "../../../../lib/estate-sale-planner/comps/provider";
import { deviceHashOf } from "../../../../lib/estate-sale-planner/device";
import { messageOf } from "../../../../lib/estate-sale-planner/errors";
import { noStore, SALE_ID } from "../../../../lib/estate-sale-planner/sales-route";
import { DESTINATIONS } from "../../../../lib/estate-sale-planner/session";
import { createAdminSupabaseClient } from "../../../../lib/estate-sale-planner/supabase-admin";
import { makeThrottle } from "../../../../lib/estate-sale-planner/throttle";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /estate-sale-planner/api/comps
 * Body: { item: { name, band, priceBefore?, destination, markReading?, note?, lotCount? }, minBand?, saleId, itemId }
 *
 * A click of the item screen's sold-price button (sold-comps design D4, D23). `band` is what
 * decides eligibility (`gateBand` on the device); `priceBefore` is the price showing. Returns
 * `{ success: true, ...CompsSummary, check?, nextCheckAt? }`; a lookup that can't run is still a
 * success with its status ("gated", "limited", "not-configured", "quota", "error"), because the
 * item simply keeps its band.
 *
 * GET ?saleId&itemId: the saved check for this item on this device, with no lookup.
 *
 * What bounds spend, honestly, while there are no accounts:
 * - One completed check per item per device per 24 hours, read from `esp_comps_checks` first.
 *   If that read fails nothing runs. Two clicks landing at the same instant could both pass, and
 *   clearing cookies gets a new device; the phone's own guard and the limits below cover those.
 *   With no database (local work) there is nothing to limit against.
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

const readThrottled = makeThrottle(60, 600);

const short = (v: unknown, max: number) => v === undefined || v === null || (typeof v === "string" && v.length <= max);

function validId(v: unknown): string | null {
  return typeof v === "string" && SALE_ID.test(v) ? v : null;
}

function validItem(i: unknown): i is LookupItem & { priceBefore?: string } {
  if (!i || typeof i !== "object") return false;
  const o = i as Record<string, unknown>;
  return (
    typeof o.name === "string" && o.name.trim().length > 0 && o.name.length <= 200 &&
    typeof o.band === "string" && o.band.length <= 40 &&
    (o.destination === undefined || (DESTINATIONS as readonly unknown[]).includes(o.destination)) &&
    short(o.markReading, 200) && short(o.note, 2000) && short(o.priceBefore, 40) &&
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
  const body = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as { item?: unknown; minBand?: unknown; saleId?: unknown; itemId?: unknown }) : null;
  if (!body || !validItem(body.item)) {
    return NextResponse.json({ error: "Send the item's name, band and destination." }, { status: 400 });
  }
  const saleId = validId(body.saleId);
  const itemId = validId(body.itemId);
  if (!saleId || !itemId) return NextResponse.json({ error: "Send the sale and item this check is for." }, { status: 400 });

  if (throttled(clientOf(request))) {
    return NextResponse.json({ error: "A few too many lookups at once — give it a minute." }, { status: 429 });
  }

  const deviceHash = await deviceHashOf(request);
  if (!deviceHash) return NextResponse.json({ error: "Reload the page and try again." }, { status: 400 });

  const db = createAdminSupabaseClient();
  const key = { deviceHash, saleId, itemId };
  if (db) {
    try {
      const latest = await getLatestCheck(db, key);
      if (!checkAllowed(latest, Date.now())) return NextResponse.json({ success: true, status: "limited", check: latest, nextCheckAt: nextCheckAt(latest!) });
    } catch (error: unknown) {
      console.error("[esp comps] couldn't read the last check; not running one:", messageOf(error));
      return NextResponse.json({ success: true, status: "error" });
    }
  }

  try {
    const { name, band, priceBefore, destination, markReading, note, lotCount } = body.item;
    const { detail, ...summary } = await lookupComps(
      { item: { name, band, destination, markReading, note, lotCount }, minBand: body.minBand, saleId: saleIdOf(saleId), fresh: true },
      { provider: providerFromEnv(), db, record: deferCost },
    );
    if (summary.status !== "gated") {
      console.info(`[esp comps] ${summary.status}${summary.cached ? " (cached)" : ""}${summary.matched !== undefined ? `, ${summary.matched}/${summary.found} matched` : ""}`);
    }
    if (!detail || (summary.status !== "ok" && summary.status !== "too-few")) return NextResponse.json({ success: true, ...summary });

    const given: CheckGiven = { name, markReading, note, lotCount, priceBefore: priceBefore ?? band };
    const check: CompsCheck = { ...detail, at: new Date().toISOString(), status: summary.status, given };
    if (db) await saveCheck(db, key, check);
    return NextResponse.json({ success: true, ...summary, check, nextCheckAt: nextCheckAt(check) });
  } catch (error: unknown) {
    console.error("[esp comps] lookup failed:", error);
    return NextResponse.json({ error: `The sold-price lookup didn't come back: ${messageOf(error).slice(0, 200)}` }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const saleId = validId(params.get("saleId"));
  const itemId = validId(params.get("itemId"));
  if (!saleId || !itemId) return NextResponse.json({ error: "Send the sale and item." }, { status: 400 });
  if (readThrottled(clientOf(request))) return NextResponse.json({ error: "A few too many at once — give it a minute." }, { status: 429 });

  const empty = { success: true, check: null, nextCheckAt: null };
  const deviceHash = await deviceHashOf(request);
  const db = createAdminSupabaseClient();
  if (!deviceHash || !db) return NextResponse.json(empty, { headers: noStore });
  try {
    const check = await getLatestCheck(db, { deviceHash, saleId, itemId });
    return NextResponse.json(check ? { success: true, check, nextCheckAt: nextCheckAt(check) } : empty, { headers: noStore });
  } catch (error: unknown) {
    console.error("[esp comps] couldn't read the saved check:", messageOf(error));
    return NextResponse.json({ error: "Couldn't load the saved check." }, { status: 502 });
  }
}
