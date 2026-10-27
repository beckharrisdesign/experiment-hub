import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { DETAIL_SHOT } from "@/lib/estate-sale-planner/config";
import { POST } from "@/app/estate-sale-planner/api/refine/route";

const savedOpenAI = process.env.OPENAI_API_KEY;
const savedAnthropic = process.env.ANTHROPIC_API_KEY;
beforeEach(() => {
  delete process.env.OPENAI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
});
afterEach(() => {
  if (savedOpenAI !== undefined) process.env.OPENAI_API_KEY = savedOpenAI;
  if (savedAnthropic !== undefined) process.env.ANTHROPIC_API_KEY = savedAnthropic;
});

const item = { name: "Upright piano", room: "Dining room", band: "$10–$25", reason: "Free to a good home.", confidence: "high" };
function req(body: unknown, ip = "1.1.1.1") {
  return new NextRequest("http://localhost/estate-sale-planner/api/refine", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /estate-sale-planner/api/refine", () => {
  it("rejects bad JSON, a missing item, no details, and too many details", async () => {
    expect((await POST(req("nope"))).status).toBe(400);
    expect((await POST(req({ details: [{ data: "AAAA", at: 0 }] }))).status).toBe(400);
    expect((await POST(req({ item, details: [] }))).status).toBe(400);
    const tooMany = Array.from({ length: DETAIL_SHOT.maxPerItem + 1 }, (_, i) => ({ data: "AAAA", at: i }));
    expect((await POST(req({ item, details: tooMany }))).status).toBe(400);
    expect((await POST(req({ item, details: [{ data: "data:image/jpeg;base64,AAAA", at: 0 }] }))).status).toBe(400);
  });

  it("takes a message, with or without a picture, and ignores one that isn't text", async () => {
    expect((await POST(req({ item, details: [], message: "this is actually a vintage Hermes" }, "2.2.2.2"))).status).toBe(200);
    expect((await POST(req({ item, details: [{ data: "AAAA", at: 0 }], message: "Hermès", reframed: true }, "2.2.2.3"))).status).toBe(200);
    expect((await POST(req({ item, details: [], message: 42 }, "2.2.2.4"))).status).toBe(400);
  });

  it("takes an item with no room (added by hand)", async () => {
    const { room: _room, ...noRoom } = item;
    expect((await POST(req({ item: noRoom, details: [{ data: "AAAA", at: 0 }], reframed: true }, "3.3.3.3"))).status).toBe(200);
    expect((await POST(req({ item: { ...item, room: 7 }, details: [{ data: "AAAA", at: 0 }] }, "3.3.3.4"))).status).toBe(400);
  });

  it("serves fixture mode with no key: the item comes back unchanged and says so", async () => {
    const res = await POST(req({ item, details: [{ data: "AAAA", at: 0 }], context: "Grandpa's" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ success: true, configured: false, source: "fixture", name: "Upright piano", markReading: null });
  });

  it("throttles a burst from one address", async () => {
    let last = 200;
    for (let i = 0; i < 14; i++) {
      last = (await POST(req({ item, details: [{ data: "AAAA", at: 0 }] }, "9.9.9.9"))).status;
    }
    expect(last).toBe(429);
  });
});
