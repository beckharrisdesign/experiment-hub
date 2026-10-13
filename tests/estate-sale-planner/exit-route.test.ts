import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { DONATE_PICKUP, HAUL_AWAY } from "@/lib/estate-sale-planner/config";

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
// Counting then redirecting (spec: donation-pickup-exit)
// ---------------------------------------------------------------------------

describe("resolveExit", () => {
  it("defaults to the donation pickup: records session, count, kind, and the placeholder referral, then points at tel:", () => {
    const { record, location } = resolveExit(new URLSearchParams("session=esp_1&count=12"));
    expect(record).toMatchObject({ event: "esp_exit_tap", kind: "donate", session: "esp_1", count: 12, fallback: false, via: "tel", referral: DONATE_PICKUP.referral });
    expect(location).toBe(DONATE_PICKUP.tel);
  });

  it("web taps carry the referral param on the partner URL", () => {
    const { location } = resolveExit(new URLSearchParams("session=s&count=1&via=web"));
    expect(location).toContain(DONATE_PICKUP.web);
    expect(location).toContain(`ref=${DONATE_PICKUP.referral}`);
  });

  it("fallback taps still count, labelled, and open the Salvation Army pickup", () => {
    const { record, location } = resolveExit(new URLSearchParams("session=s&count=3&fallback=1"));
    expect(record.fallback).toBe(true);
    expect(location).toBe(DONATE_PICKUP.fallback.web);
  });

  it("the demoted junk-haul link is its own kind and ignores fallback", () => {
    const { record, location } = resolveExit(new URLSearchParams("kind=haul&session=s&via=web&fallback=1"));
    expect(record.kind).toBe("haul");
    expect(record.fallback).toBe(false);
    expect(location).toContain(HAUL_AWAY.web);
    expect(location).toContain(`ref=${HAUL_AWAY.referral}`);
  });

  it("clamps junk counts and missing sessions", () => {
    const { record } = resolveExit(new URLSearchParams("count=-5"));
    expect(record.count).toBe(0);
    expect(record.session).toBe("unknown");
  });
});

describe("GET /estate-sale-planner/api/exit", () => {
  it("logs the record (no database configured) and 302s", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await GET(req("session=esp_2&count=4"));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(DONATE_PICKUP.tel);
    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.parse(log.mock.calls[0][0] as string)).toMatchObject({ session: "esp_2", count: 4, metadata: { kind: "donate" } });
    log.mockRestore();
  });
});
