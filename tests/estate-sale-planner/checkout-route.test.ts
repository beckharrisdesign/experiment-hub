import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { EXPERIMENT_ID, SELL_SHEET } from "@/lib/estate-sale-planner/config";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  getSheetBySession: vi.fn(),
  upsertSheet: vi.fn(),
  attachCheckout: vi.fn(),
  recordEvent: vi.fn(),
  stripeRef: { current: null as null | { checkout: { sessions: { create: unknown } } } },
}));

vi.mock("@/lib/estate-sale-planner/stripe", () => ({
  get stripe() {
    return mocks.stripeRef.current;
  },
}));
vi.mock("@/lib/estate-sale-planner/db", () => ({
  getSheetBySession: mocks.getSheetBySession,
  upsertSheet: mocks.upsertSheet,
  attachCheckout: mocks.attachCheckout,
  recordEvent: mocks.recordEvent,
}));

import { POST } from "@/app/estate-sale-planner/api/checkout/route";

const good = {
  sessionId: "esp_m1abc_x1y2z3",
  walkthroughAt: "2026-10-13T12:00:00.000Z",
  items: [{ name: "Teak sideboard", room: "Living room", band: "$500–$2,000", reason: "Mid-century.", confidence: "high" }],
};

function req(body: unknown) {
  return new NextRequest("http://localhost/estate-sale-planner/api/checkout", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://hub.test" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.stripeRef.current = { checkout: { sessions: { create: mocks.create } } };
  mocks.getSheetBySession.mockResolvedValue(null);
  mocks.upsertSheet.mockResolvedValue("11111111-2222-4333-8444-555555555555");
  mocks.create.mockResolvedValue({ id: "cs_test_1", url: "https://checkout.stripe.com/c/cs_test_1" });
});

describe("POST /estate-sale-planner/api/checkout", () => {
  it("rejects a body that is not a sheet", async () => {
    expect((await POST(req("nope"))).status).toBe(400);
    expect((await POST(req({ ...good, items: [] }))).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("returns a clean 500 when Stripe is not configured", async () => {
    mocks.stripeRef.current = null;
    const res = await POST(req(good));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/not configured/);
  });

  it("saves the sheet, opens Checkout with experiment + sheet metadata, and counts the start", async () => {
    const res = await POST(req(good));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("https://checkout.stripe.com/c/cs_test_1");
    expect(mocks.upsertSheet).toHaveBeenCalledWith(expect.objectContaining({ sessionId: good.sessionId }));
    const args = mocks.create.mock.calls[0][0];
    expect(args.mode).toBe("payment");
    expect(args.line_items[0].price_data.unit_amount).toBe(SELL_SHEET.priceCents);
    expect(args.metadata).toEqual({ experiment_id: EXPERIMENT_ID, order_id: "11111111-2222-4333-8444-555555555555" });
    expect(args.success_url).toBe("https://hub.test/estate-sale-planner/sheet/11111111-2222-4333-8444-555555555555?paid=1");
    expect(args.cancel_url).toContain("/estate-sale-planner/summary?canceled=1");
    expect(mocks.attachCheckout).toHaveBeenCalledWith("11111111-2222-4333-8444-555555555555", "cs_test_1");
    expect(mocks.recordEvent).toHaveBeenCalledWith(expect.objectContaining({ event: "esp_sheet_checkout", session: good.sessionId }));
  });

  it("hands back the existing link without charging when the session already paid", async () => {
    mocks.getSheetBySession.mockResolvedValue({ id: "paid-id", status: "paid" });
    const res = await POST(req(good));
    expect(await res.json()).toEqual({ url: "/estate-sale-planner/sheet/paid-id", paid: true });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.upsertSheet).not.toHaveBeenCalled();
  });

  it("explains a missing database rather than leaking the error", async () => {
    mocks.upsertSheet.mockRejectedValue(new Error("Supabase not configured"));
    const res = await POST(req(good));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/Saving sheets is not configured/);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
