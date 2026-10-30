import { NextRequest, NextResponse } from "next/server";
import { DONATE_PICKUP } from "../../../../lib/estate-sale-planner/config";
import { recordEvent } from "../../../../lib/estate-sale-planner/db";

export const runtime = "nodejs";

/**
 * GET /estate-sale-planner/api/exit?session=…&count=…&fallback=0|1&via=tel|web
 *
 * The counted exit: hands the Donate list to a pickup service. There is no
 * haul-away exit (founder, 2026-10-30: "I don't want to wire up hauling away -
 * don't include the button"); any `kind` resolves to the donation pickup. The
 * tap is recorded as an esp_events row
 * (structured log line when Supabase is not configured) and then redirected.
 * `fallback=1` means the user said the service doesn't cover them, so the
 * fallback link opens instead; the tap still counts, labelled.
 */

export type ExitKind = "donate";

export interface ExitRecord {
  event: "esp_exit_tap";
  kind: ExitKind;
  session: string;
  count: number;
  fallback: boolean;
  via: "tel" | "web";
  referral: string;
  at: string;
}

/** Pure: what gets recorded and where the user goes. Exported for tests. */
export function resolveExit(params: URLSearchParams): { record: ExitRecord; location: string } {
  const kind: ExitKind = "donate";
  const session = (params.get("session") ?? "").slice(0, 64) || "unknown";
  const count = Math.max(0, Math.min(999, Number.parseInt(params.get("count") ?? "0", 10) || 0));
  const fallback = params.get("fallback") === "1";
  const via: "tel" | "web" = params.get("via") === "web" ? "web" : "tel";
  const partner = DONATE_PICKUP;

  const record: ExitRecord = {
    event: "esp_exit_tap",
    kind,
    session,
    count,
    fallback,
    via,
    referral: partner.referral,
    at: new Date().toISOString(),
  };

  let location: string;
  if (fallback) {
    location = DONATE_PICKUP.fallback.web;
  } else if (via === "web") {
    const url = new URL(partner.web);
    url.searchParams.set("ref", partner.referral);
    location = url.toString();
  } else {
    location = partner.tel;
  }
  return { record, location };
}

export async function GET(request: NextRequest) {
  const { record, location } = resolveExit(request.nextUrl.searchParams);
  // The row is the receipt the Propose threshold ("≥ 5 pickup taps in 14
  // days") is counted from; recordEvent also prints it and never throws.
  await recordEvent({
    event: record.event,
    session: record.session,
    count: record.count,
    fallback: record.fallback,
    via: record.via,
    referral: record.referral,
    metadata: { kind: record.kind },
    at: record.at,
  });
  return NextResponse.redirect(location, { status: 302 });
}
