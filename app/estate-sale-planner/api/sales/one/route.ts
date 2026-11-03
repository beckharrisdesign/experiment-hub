import { NextRequest, NextResponse } from "next/server";
import { getSale } from "../../../../../lib/estate-sale-planner/sales-db";
import { SALE_ID, contextOf, failed, noStore, notFound } from "../../../../../lib/estate-sale-planner/sales-route";
import { makeThrottle } from "../../../../../lib/estate-sale-planner/throttle";

export const runtime = "nodejs";

/** GET /estate-sale-planner/api/sales/one?id= — one of this device's sales, or 404 (esp-server-sales D4). */

const throttled = makeThrottle(60, 600);

export async function GET(request: NextRequest) {
  const ctx = await contextOf(request, throttled);
  if ("response" in ctx) return ctx.response;
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!SALE_ID.test(id)) return notFound();
  try {
    const sale = await getSale(ctx.db, ctx.deviceHash, id);
    return sale ? NextResponse.json({ success: true, ...sale }, { headers: noStore }) : notFound();
  } catch (error: unknown) {
    return failed("load the sale", error);
  }
}
