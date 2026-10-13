import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { HAUL_AWAY } from "@/lib/estate-sale-planner/config";

let GET: typeof import("@/app/estate-sale-planner/api/exit/route").GET;
let resolveExit: typeof import("@/app/estate-sale-planner/api/exit/route").resolveExit;

beforeEach(async () => {
  vi.clearAllMocks();
  ({ GET, resolveExit } = await import("@/app/estate-sale-planner/api/exit/route"));
});

function req(query: string) {
  return new NextRequest(`http://localhost/estate-sale-planner/api/exit?${query}`);
}

// ---------------------------------------------------------------------------
// Counting then redirecting (spec: haul-away-exit)
// ---------------------------------------------------------------------------

describe("resolveExit", () => {
  it("records session, count, and the placeholder referral, then points at tel:", () => {
    const { record, location } = resolveExit(new URLSearchParams("session=esp_1&count=12"));
    expect(record).toMatchObject({ event: "esp_exit_tap", session: "esp_1", count: 12, fallback: false, via: "tel", referral: HAUL_AWAY.referral });
    expect(location).toBe(HAUL_AWAY.tel);
  });

  it("web taps carry the referral param on the partner URL", () => {
    const { location } = resolveExit(new URLSearchParams("session=s&count=1&via=web"));
    expect(location).toContain(HAUL_AWAY.web);
    expect(location).toContain(`ref=${HAUL_AWAY.referral}`);
  });

  it("fallback taps still count, labelled, and open the generic hauler link", () => {
    const { record, location } = resolveExit(new URLSearchParams("session=s&count=3&fallback=1"));
    expect(record.fallback).toBe(true);
    expect(location).toBe(HAUL_AWAY.fallback.web);
  });

  it("clamps junk counts and missing sessions", () => {
    const { record } = resolveExit(new URLSearchParams("count=-5"));
    expect(record.count).toBe(0);
    expect(record.session).toBe("unknown");
  });
});

describe("GET /estate-sale-planner/api/exit", () => {
  it("logs the record and 302s", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await GET(req("session=esp_2&count=4"));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(HAUL_AWAY.tel);
    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.parse(log.mock.calls[0][0] as string)).toMatchObject({ session: "esp_2", count: 4 });
    log.mockRestore();
  });
});
