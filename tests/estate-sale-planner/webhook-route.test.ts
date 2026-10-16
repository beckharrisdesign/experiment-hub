import { describe, it, expect, vi, beforeEach } from "vitest";
import { EXPERIMENT_ID } from "@/lib/estate-sale-planner/config";

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  getSheet: vi.fn(),
  markPaid: vi.fn(),
  recordBuyerEmail: vi.fn(),
  headersGet: vi.fn(() => "sig_123"),
}));

vi.mock("@/lib/estate-sale-planner/stripe", () => ({
  stripe: { webhooks: { constructEvent: mocks.constructEvent } },
  webhookSecret: () => "whsec_esp_test",
}));
vi.mock("@/lib/estate-sale-planner/db", () => ({
  getSheet: mocks.getSheet,
  markPaid: mocks.markPaid,
  recordBuyerEmail: mocks.recordBuyerEmail,
}));
vi.mock("next/headers", () => ({ headers: async () => ({ get: mocks.headersGet }) }));

import { POST } from "@/app/estate-sale-planner/api/webhook/route";

const req = { text: async () => "raw-body" } as never;
const SHEET = "11111111-2222-4333-8444-555555555555";

function completed(overrides: Record<string, unknown> = {}, id = "evt_1") {
  return {
    id,
    type: "checkout.session.completed",
    livemode: false,
    data: {
      object: {
        metadata: { experiment_id: EXPERIMENT_ID, order_id: SHEET },
        payment_status: "paid",
        payment_intent: "pi_1",
        amount_total: 500,
        currency: "usd",
        customer_details: { email: "buyer@example.com" },
        ...overrides,
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSheet.mockResolvedValue({ id: SHEET, status: "checkout_started", stripe_event_id: null });
  mocks.markPaid.mockResolvedValue(undefined);
  mocks.recordBuyerEmail.mockResolvedValue(undefined);
});

describe("POST /estate-sale-planner/api/webhook", () => {
  it("rejects a bad signature", async () => {
    mocks.constructEvent.mockImplementation(() => {
      throw new Error("bad sig");
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mocks.markPaid).not.toHaveBeenCalled();
  });

  it("acks unrelated events without touching the sheet", async () => {
    mocks.constructEvent.mockReturnValue({ id: "evt_x", type: "payment_intent.created", data: { object: {} } });
    expect((await POST(req)).status).toBe(200);
    expect(mocks.markPaid).not.toHaveBeenCalled();
  });

  it("ignores a checkout scoped to another experiment", async () => {
    mocks.constructEvent.mockReturnValue(completed({ metadata: { experiment_id: "etsy-listing-kit", order_id: SHEET } }));
    const res = await POST(req);
    expect((await res.json()).ignored).toMatch(/scope/);
    expect(mocks.markPaid).not.toHaveBeenCalled();
  });

  it("marks the sheet paid and records the buyer email in the shared submissions table", async () => {
    mocks.constructEvent.mockReturnValue(completed());
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mocks.markPaid).toHaveBeenCalledWith(SHEET, expect.objectContaining({ stripeEventId: "evt_1", stripePaymentIntent: "pi_1", amountTotal: 500, livemode: false, customerEmail: "buyer@example.com" }));
    expect(mocks.recordBuyerEmail).toHaveBeenCalledWith("buyer@example.com", SHEET, expect.objectContaining({ amount_total: 500 }));
  });

  it("is idempotent on the Stripe event id", async () => {
    mocks.getSheet.mockResolvedValue({ id: SHEET, status: "paid", stripe_event_id: "evt_1" });
    mocks.constructEvent.mockReturnValue(completed());
    const res = await POST(req);
    expect((await res.json()).duplicate).toBe(true);
    expect(mocks.markPaid).not.toHaveBeenCalled();
  });

  it("returns 500 so Stripe retries when the database write fails", async () => {
    mocks.constructEvent.mockReturnValue(completed());
    mocks.markPaid.mockRejectedValue(new Error("db down"));
    expect((await POST(req)).status).toBe(500);
  });
});
