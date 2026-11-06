// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

const KEYS = ["COMPS_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
let POST: typeof import("@/app/estate-sale-planner/api/comps/route").POST;
beforeEach(async () => {
  for (const k of KEYS) delete process.env[k];
  vi.spyOn(console, "info").mockImplementation(() => {});
  // A fresh module per test: the rate-limit windows live at module scope.
  vi.resetModules();
  ({ POST } = await import("@/app/estate-sale-planner/api/comps/route"));
});
afterEach(() => {
  for (const k of KEYS) if (saved[k] !== undefined) process.env[k] = saved[k];
  vi.restoreAllMocks();
});

const item = { name: "Lodge No. 8 skillet", band: "$100–$250", destination: "sell" };
function req(body: unknown, ip = "1.1.1.1") {
  return new NextRequest("http://localhost/estate-sale-planner/api/comps", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip, cookie: `esp-device=${"a".repeat(43)}` },
    body: typeof body === "string" ? body : JSON.stringify(typeof body === "object" && body && !Array.isArray(body) && "item" in body ? { saleId: "esp_abc", itemId: "esp_abc_0", ...body } : body),
  });
}

describe("POST /estate-sale-planner/api/comps", () => {
  it("rejects bad JSON and malformed items", async () => {
    expect((await POST(req("nope"))).status).toBe(400);
    expect((await POST(req({}))).status).toBe(400);
    expect((await POST(req("null"))).status).toBe(400);
    expect((await POST(req("[]"))).status).toBe(400);
    expect((await POST(req({ item: { ...item, name: "" } }))).status).toBe(400);
    expect((await POST(req({ item: { ...item, destination: "toss" } }))).status).toBe(400);
    expect((await POST(req({ item: { ...item, lotCount: -1 } }))).status).toBe(400);
  });

  it("gates on the server: Keep, a low band, or a tampered threshold make no lookup", async () => {
    expect(await (await POST(req({ item: { ...item, destination: "keep" } }))).json()).toEqual({ success: true, status: "gated" });
    expect(await (await POST(req({ item: { ...item, band: "$25–$50" }, minBand: "under $1" }))).json()).toEqual({ success: true, status: "gated" });
  });

  it("with no provider key, a gated item keeps its band and the answer says lookups aren't configured", async () => {
    const res = await POST(req({ item }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, status: "not-configured" });
  });

  it("throttles a burst from one address", async () => {
    let last = 200;
    for (let i = 0; i < 14; i++) last = (await POST(req({ item }, "9.9.9.9"))).status;
    expect(last).toBe(429);
  });

  it("caps the instance too, so a new address per request doesn't get past it", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 62; i++) statuses.push((await POST(req({ item }, `10.0.${Math.floor(i / 250)}.${i % 250}`))).status);
    expect(statuses.slice(0, 60).every((s) => s === 200)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });
});
