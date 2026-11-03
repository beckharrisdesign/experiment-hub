import { NextRequest, NextResponse } from "next/server";
import { listSales, saveSale } from "../../../../lib/estate-sale-planner/sales-db";
import { MAX_SALE_BYTES, SALE_ID, contextOf, failed, noStore, notFound } from "../../../../lib/estate-sale-planner/sales-route";
import { deviceHashOf } from "../../../../lib/estate-sale-planner/device";
import type { Session } from "../../../../lib/estate-sale-planner/session";
import { makeThrottle } from "../../../../lib/estate-sale-planner/throttle";

export const runtime = "nodejs";

/**
 * /estate-sale-planner/api/sales (esp-server-sales design D4)
 *
 * GET: this device's sales as Home rows, newest first, each with its version.
 * POST { id, version, session }: save a sale. The newest version wins and only this device
 * can write its sales; another device's id answers 404, the same as one that never existed.
 */

const throttled = makeThrottle(60, 600);

function validSale(body: unknown): body is { id: string; version: number; session: Session } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const { id, version, session } = body as Record<string, unknown>;
  if (typeof id !== "string" || !SALE_ID.test(id)) return false;
  if (!Number.isSafeInteger(version) || (version as number) <= 0) return false;
  if (!session || typeof session !== "object" || Array.isArray(session)) return false;
  const s = session as Record<string, unknown>;
  return s.id === id && Array.isArray(s.items) && typeof s.createdAt === "string";
}

export async function GET(request: NextRequest) {
  // No id yet means no sales yet, not an error.
  if (!(await deviceHashOf(request))) return NextResponse.json({ success: true, sales: [] }, { headers: noStore });
  const ctx = await contextOf(request, throttled);
  if ("response" in ctx) return ctx.response;
  try {
    return NextResponse.json({ success: true, sales: await listSales(ctx.db, ctx.deviceHash) }, { headers: noStore });
  } catch (error: unknown) {
    return failed("list your sales", error);
  }
}

export async function POST(request: NextRequest) {
  const ctx = await contextOf(request, throttled);
  if ("response" in ctx) return ctx.response;
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_SALE_BYTES) return NextResponse.json({ error: "That sale is too big to save in one go." }, { status: 413 });
  let raw: string;
  let body: unknown;
  try {
    raw = await request.text();
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Expected JSON with id, version and session." }, { status: 400 });
  }
  if (raw.length > MAX_SALE_BYTES) return NextResponse.json({ error: "That sale is too big to save in one go." }, { status: 413 });
  if (!validSale(body)) return NextResponse.json({ error: "Send the sale's id, a version and the sale." }, { status: 400 });
  try {
    const result = await saveSale(ctx.db, { id: body.id, deviceHash: ctx.deviceHash, version: body.version, session: body.session });
    if (result === "not-found") return notFound();
    return NextResponse.json({ success: true, saved: result === "saved" });
  } catch (error: unknown) {
    return failed("save the sale", error);
  }
}
