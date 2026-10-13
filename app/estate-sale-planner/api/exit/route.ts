import { NextRequest, NextResponse } from "next/server";
import { HAUL_AWAY } from "../../../../lib/estate-sale-planner/config";

export const runtime = "nodejs";

/**
 * GET /estate-sale-planner/api/exit?session=…&count=…&fallback=0|1&via=tel|web
 *
 * The counted exit. The tap is recorded server-side (a structured log line
 * that the function logs keep — v1 has no table) and then redirected to the
 * haul-away link. `fallback=1` means the user said the service doesn't cover
 * them, so the generic "find a hauler" link opens instead; the tap still
 * counts, labelled as fallback (spec: haul-away-exit).
 */

export interface ExitRecord {
  event: "esp_exit_tap";
  session: string;
  count: number;
  fallback: boolean;
  via: "tel" | "web";
  referral: string;
  at: string;
}

/** Pure: what gets recorded and where the user goes. Exported for tests. */
export function resolveExit(params: URLSearchParams): { record: ExitRecord; location: string } {
  const session = (params.get("session") ?? "").slice(0, 64) || "unknown";
  const count = Math.max(0, Math.min(999, Number.parseInt(params.get("count") ?? "0", 10) || 0));
  const fallback = params.get("fallback") === "1";
  const via: "tel" | "web" = params.get("via") === "web" ? "web" : "tel";

  const record: ExitRecord = {
    event: "esp_exit_tap",
    session,
    count,
    fallback,
    via,
    referral: HAUL_AWAY.referral,
    at: new Date().toISOString(),
  };

  let location: string;
  if (fallback) {
    location = HAUL_AWAY.fallback.web;
  } else if (via === "web") {
    const url = new URL(HAUL_AWAY.web);
    url.searchParams.set("ref", HAUL_AWAY.referral);
    location = url.toString();
  } else {
    location = HAUL_AWAY.tel;
  }
  return { record, location };
}

export async function GET(request: NextRequest) {
  const { record, location } = resolveExit(request.nextUrl.searchParams);
  // The record IS the receipt — structured so the logs can be grepped for the
  // Propose threshold ("≥ 5 haul-away taps") without a database in v1.
  console.log(JSON.stringify(record));
  return NextResponse.redirect(location, { status: 302 });
}
