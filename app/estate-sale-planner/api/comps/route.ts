import { NextRequest, NextResponse } from "next/server";
import { deferCost, saleIdOf } from "../../../../lib/estate-sale-planner/costs";
import { lookupComps, type LookupItem } from "../../../../lib/estate-sale-planner/comps/lookup";
import { providerFromEnv } from "../../../../lib/estate-sale-planner/comps/provider";
import { DESTINATIONS } from "../../../../lib/estate-sale-planner/session";
import { createAdminSupabaseClient } from "../../../../lib/estate-sale-planner/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /estate-sale-planner/api/comps
 * Body: { item: { name, band, destination, markReading?, note?, lotCount? }, minBand?, saleId? }
 *
 * The sold-price lookup (sold-comps design D4). The server checks the gate again — Sell, and a
 * band at or above the person's threshold, resolved to an offered choice — so a tampered body
 * can't buy lookups. Returns a CompsSummary; a lookup that can't run is still a 200 with its
 * status ("gated", "not-configured", "quota", "error"), because the item simply keeps its band.
 */

const hits = new Map<string, number[]>();
function throttled(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 12;
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
  let body: { item?: unknown; minBand?: unknown; saleId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON with an item." }, { status: 400 });
  }
  if (!validItem(body.item)) {
    return NextResponse.json({ error: "Send the item's name, band and destination." }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (throttled(ip)) {
    return NextResponse.json({ error: "A few too many lookups at once — give it a minute." }, { status: 429 });
  }

  const { name, band, destination, markReading, note, lotCount } = body.item;
  const summary = await lookupComps(
    { item: { name, band, destination, markReading, note, lotCount }, minBand: body.minBand, saleId: saleIdOf(body.saleId) },
    { provider: providerFromEnv(), db: createAdminSupabaseClient(), record: deferCost },
  );
  if (summary.status !== "gated") {
    console.info(`[esp comps] ${summary.status}${summary.cached ? " (cached)" : ""}${summary.matched !== undefined ? `, ${summary.matched}/${summary.found} matched` : ""}`);
  }
  return NextResponse.json(summary);
}
