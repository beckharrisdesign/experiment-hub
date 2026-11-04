import { describe, it, expect, vi, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { costRow, modelCents, priceFor, recordCost, saleIdOf } from "@/lib/estate-sale-planner/costs";

afterEach(() => vi.restoreAllMocks());

describe("pricing", () => {
  it("matches the dated ids vendors answer with", () => {
    expect(priceFor("gpt-5-nano-2025-08-07")).toEqual({ input: 0.05, output: 0.4 });
    expect(priceFor("gpt-5-2025-08-07")).toEqual({ input: 1.25, output: 10 });
    expect(priceFor("claude-haiku-5-5")).toEqual({ input: 0.1, output: 0.5 });
    expect(priceFor("gpt-50")).toBeNull();
  });

  it("turns tokens into cents, and an unknown model into 0", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    // 10,000 in + 2,000 out on gpt-5: $0.0125 + $0.02 = 3.25¢.
    expect(modelCents("gpt-5", 10_000, 2_000)).toBeCloseTo(3.25);
    expect(modelCents("someone-elses-model", 10_000, 2_000)).toBe(0);
  });
});

describe("the cost row", () => {
  it("records a walkthrough with its model, tokens and cents for the sale", () => {
    expect(costRow({ kind: "walkthrough", saleId: "esp_abc", provider: "openai", model: "gpt-5", inputTokens: 10_000, outputTokens: 2_000 })).toMatchObject({
      experiment_id: "estate-sale-planner",
      sale_id: "esp_abc",
      kind: "walkthrough",
      model: "gpt-5",
      input_tokens: 10_000,
      output_tokens: 2_000,
      cents: 3.25,
      cache_hit: false,
      ok: true,
    });
  });

  it("records a cache hit at zero and a lookup at the provider's price", () => {
    expect(costRow({ kind: "lookup", provider: "compsapi", cents: 0, cacheHit: true })).toMatchObject({ cents: 0, cache_hit: true });
    expect(costRow({ kind: "lookup", provider: "compsapi", cents: 0.18 })).toMatchObject({ cents: 0.18 });
  });
});

describe("recordCost", () => {
  it("never throws when the table can't be written; it logs", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = { from: () => ({ insert: async () => ({ error: { message: "relation esp_costs does not exist" } }) }) } as unknown as SupabaseClient;
    await expect(recordCost({ kind: "reread", model: "gpt-5" }, failing)).resolves.toBe("failed");
    const throwing = { from: () => { throw new Error("boom"); } } as unknown as SupabaseClient;
    await expect(recordCost({ kind: "reread", model: "gpt-5" }, throwing)).resolves.toBe("failed");
    expect(err).toHaveBeenCalledTimes(2);
  });

  it("logs the row when Supabase isn't configured", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    await expect(recordCost({ kind: "walkthrough", model: "gpt-5" }, null)).resolves.toBe("log");
  });

  it("writes one row", async () => {
    const insert = vi.fn(async () => ({ error: null }));
    const db = { from: vi.fn(() => ({ insert })) } as unknown as SupabaseClient;
    await expect(recordCost({ kind: "query", model: "gpt-5-nano", inputTokens: 100, outputTokens: 10 }, db)).resolves.toBe("db");
    expect(insert).toHaveBeenCalledTimes(1);
  });
});

it("accepts only sale ids that look like ids", () => {
  expect(saleIdOf("esp_mh2k_ab12cd")).toBe("esp_mh2k_ab12cd");
  expect(saleIdOf("esp; drop table")).toBeUndefined();
  expect(saleIdOf(42)).toBeUndefined();
});
