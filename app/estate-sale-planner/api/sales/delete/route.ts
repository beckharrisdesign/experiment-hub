import { NextRequest, NextResponse } from "next/server";
import { deleteSale } from "../../../../../lib/estate-sale-planner/sales-db";
import { SALE_ID, contextOf, failed, notFound } from "../../../../../lib/estate-sale-planner/sales-route";
import { makeThrottle } from "../../../../../lib/estate-sale-planner/throttle";

export const runtime = "nodejs";

/** POST /estate-sale-planner/api/sales/delete { id } — delete one of this device's sales and its photos (esp-server-sales D3). */

const throttled = makeThrottle(60, 600);

export async function POST(request: NextRequest) {
  const ctx = await contextOf(request, throttled);
  if ("response" in ctx) return ctx.response;
  let id: unknown;
  try {
    id = ((await request.json()) as { id?: unknown } | null)?.id;
  } catch {
    return NextResponse.json({ error: "Expected JSON with the sale's id." }, { status: 400 });
  }
  if (typeof id !== "string" || !SALE_ID.test(id)) return notFound();
  try {
    return (await deleteSale(ctx.db, ctx.deviceHash, id)) ? NextResponse.json({ success: true }) : notFound();
  } catch (error: unknown) {
    return failed("delete the sale", error);
  }
}
