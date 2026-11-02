import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/estate-sale-planner/api/comps/route";

const KEYS = ["COMPS_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
beforeEach(() => {
  for (const k of KEYS) delete process.env[k];
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  for (const k of KEYS) if (saved[k] !== undefined) process.env[k] = saved[k];
  vi.restoreAllMocks();
});

const item = { name: "Lodge No. 8 skillet", band: "$100–$250", destination: "sell" };
function req(body: unknown, ip = "1.1.1.1") {
  return new NextRequest("http://localhost/estate-sale-planner/api/comps", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /estate-sale-planner/api/comps", () => {
  it("rejects bad JSON and malformed items", async () => {
    expect((await POST(req("nope"))).status).toBe(400);
    expect((await POST(req({}))).status).toBe(400);
    expect((await POST(req({ item: { ...item, name: "" } }))).status).toBe(400);
    expect((await POST(req({ item: { ...item, destination: "toss" } }))).status).toBe(400);
    expect((await POST(req({ item: { ...item, lotCount: -1 } }))).status).toBe(400);
  });

  it("gates on the server: Keep, a low band, or a tampered threshold make no lookup", async () => {
    expect(await (await POST(req({ item: { ...item, destination: "keep" } }, "2.2.2.1"))).json()).toEqual({ status: "gated" });
    expect(await (await POST(req({ item: { ...item, band: "$25–$50" }, minBand: "under $1" }, "2.2.2.2"))).json()).toEqual({ status: "gated" });
  });

  it("with no provider key, a gated item keeps its band and the answer says lookups aren't configured", async () => {
    const res = await POST(req({ item, saleId: "esp_abc" }, "3.3.3.3"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "not-configured" });
  });

  it("throttles a burst from one address", async () => {
    let last = 200;
    for (let i = 0; i < 14; i++) last = (await POST(req({ item }, "9.9.9.9"))).status;
    expect(last).toBe(429);
  });
});
