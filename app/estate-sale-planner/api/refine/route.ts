import { NextRequest, NextResponse } from "next/server";
import { DETAIL_SHOT } from "../../../../lib/estate-sale-planner/config";
import { visionConfigured, type FrameInput } from "../../../../lib/estate-sale-planner/flag";
import { refineItem, type RefineInput } from "../../../../lib/estate-sale-planner/refine";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /estate-sale-planner/api/refine
 * Body: { item: { name, room, band, reason, confidence }, details: [{ data, at }], context? }
 *
 * The detail-shot re-read: one item and up to DETAIL_SHOT.maxPerItem close-ups
 * go to whichever provider is keyed; the item comes back with a better read
 * and what the model could make of any mark. Fixture mode returns the item
 * unchanged with `source: "fixture"` — the shot is kept, nothing is re-read.
 *
 * Also carries the sold-comps corrections: `reframed: true` when the single photo is a crop
 * the family drew (D3), and `message` for "Adjust this item" (D14) — a message may come with
 * no photo at all.
 */

const MAX_BASE64_PER_DETAIL = 1_200_000; // ~900 KB JPEG; a 1024 px detail is ~150–400 KB

const hits = new Map<string, number[]>();
function throttled(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 12;
}

function validDetail(f: unknown): f is FrameInput {
  if (!f || typeof f !== "object") return false;
  const { data, at } = f as Record<string, unknown>;
  return typeof data === "string" && data.length > 0 && data.length <= MAX_BASE64_PER_DETAIL && !data.startsWith("data:") && typeof at === "number";
}

function validItem(i: unknown): i is RefineInput["item"] {
  if (!i || typeof i !== "object") return false;
  const o = i as Record<string, unknown>;
  return ["name", "room", "band", "reason", "confidence"].every((k) => typeof o[k] === "string" && (o[k] as string).length <= 200);
}

export async function POST(request: NextRequest) {
  let body: { item?: unknown; details?: unknown; context?: unknown; message?: unknown; reframed?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON with an item and detail photos." }, { status: 400 });
  }
  const details = Array.isArray(body.details) ? body.details : null;
  if (body.message !== undefined && typeof body.message !== "string") {
    return NextResponse.json({ error: "A message is text." }, { status: 400 });
  }
  const message = typeof body.message === "string" && body.message.trim() ? body.message.trim().slice(0, 500) : undefined;
  // A message can stand alone (an item with no picture); a re-read without one needs a photo.
  if (!validItem(body.item) || !details || (details.length === 0 && !message)) {
    return NextResponse.json({ error: "Send the item and at least one photo, or a message." }, { status: 400 });
  }
  if (details.length > DETAIL_SHOT.maxPerItem) {
    return NextResponse.json({ error: `Up to ${DETAIL_SHOT.maxPerItem} detail photos per item.` }, { status: 400 });
  }
  if (!details.every(validDetail)) {
    return NextResponse.json({ error: "Each detail needs base64 JPEG data." }, { status: 400 });
  }
  const context = typeof body.context === "string" ? body.context.slice(0, 500) : undefined;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (throttled(ip)) {
    return NextResponse.json({ error: "A few too many re-reads at once — give it a minute." }, { status: 429 });
  }

  try {
    const result = await refineItem({ item: body.item, details, context, message, reframed: body.reframed === true });
    return NextResponse.json({ success: true, configured: visionConfigured(), ...result });
  } catch (error: any) {
    console.error("[esp refine] re-read failed:", error);
    return NextResponse.json({ error: `The re-read didn't come back: ${error.message ?? "unknown error"}` }, { status: 502 });
  }
}
