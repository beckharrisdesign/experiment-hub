import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { PHOTO_BUDGET } from "@/lib/estate-sale-planner/config";

let POST: typeof import("@/app/estate-sale-planner/api/flag/route").POST;

const saved = process.env.ANTHROPIC_API_KEY;
const savedOpenAI = process.env.OPENAI_API_KEY;
let ipSeq = 0;

beforeEach(async () => {
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.OPENAI_API_KEY;
  ({ POST } = await import("@/app/estate-sale-planner/api/flag/route"));
});
afterEach(() => {
  if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
  if (savedOpenAI !== undefined) process.env.OPENAI_API_KEY = savedOpenAI;
});

function req(body: unknown, ip?: string) {
  return new NextRequest("http://localhost/estate-sale-planner/api/flag", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip ?? `10.0.1.${++ipSeq}` },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const frame = { data: "/9j/4AAQSkZJRg==", at: 0 };

// ---------------------------------------------------------------------------
// Fixture mode (no key) — the demo path
// ---------------------------------------------------------------------------

describe("POST /estate-sale-planner/api/flag (no key)", () => {
  it("returns the fixture set and says it is not configured", async () => {
    const res = await POST(req({ frames: [frame] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.configured).toBe(false);
    expect(json.source).toBe("fixture");
    expect(json.items.length).toBeGreaterThan(0);
  });

  it("rejects a body without frames", async () => {
    expect((await POST(req({}))).status).toBe(400);
    expect((await POST(req("not json"))).status).toBe(400);
  });

  it("refuses more frames than the budget", async () => {
    const frames = Array.from({ length: PHOTO_BUDGET.maxPhotos + 1 }, () => frame);
    const res = await POST(req({ frames }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/budget/i);
  });

  it("refuses data: URLs and non-numeric times", async () => {
    expect((await POST(req({ frames: [{ data: "data:image/jpeg;base64,AAAA", at: 0 }] }))).status).toBe(400);
    expect((await POST(req({ frames: [{ data: "AAAA", at: "soon" }] }))).status).toBe(400);
  });

  it("grows the demo house from the known list, and rejects a malformed one", async () => {
    const first = await (await POST(req({ frames: [frame], known: [] }, "10.0.4.1"))).json();
    const firstRooms = new Set(first.items.map((i: { room: string }) => i.room));
    expect(firstRooms.size).toBe(3);
    const known = first.items.map(({ name, room }: { name: string; room: string }) => ({ name, room }));
    const second = await (await POST(req({ frames: [frame], known }, "10.0.4.1"))).json();
    expect(second.items.length).toBeGreaterThan(0);
    expect(second.items.every((i: { room: string }) => !firstRooms.has(i.room))).toBe(true);
    expect((await POST(req({ frames: [frame], known: [{ name: "", room: "x" }] }, "10.0.4.1"))).status).toBe(400);
    expect((await POST(req({ frames: [frame], known: "nope" }, "10.0.4.1"))).status).toBe(400);
  });

  it("throttles one IP after 6 walkthroughs in a minute", async () => {
    const ip = "10.0.9.9";
    for (let i = 0; i < 6; i++) expect((await POST(req({ frames: [frame] }, ip))).status).toBe(200);
    expect((await POST(req({ frames: [frame] }, ip))).status).toBe(429);
  });
});
