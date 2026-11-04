/**
 * The cost ledger (sold-comps design D8): one `esp_costs` row per model call or lookup, so
 * what a room costs is a query, not a guess (supabase/migrations/019_esp_comps_costs.sql).
 *
 * Recording never fails the request it describes (spec): no Supabase, a write error, or a
 * thrown client all end in one log line and nothing else.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { after } from "next/server";
import { EXPERIMENT_ID, MODEL_PRICES } from "./config";
import { messageOf } from "./errors";
import { createAdminSupabaseClient } from "./supabase-admin";

export type CostKind = "walkthrough" | "reread" | "query" | "comps" | "lookup";

export interface CostInput {
  kind: CostKind;
  sessionId?: string;
  saleId?: string;
  provider?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  /** Set for lookups (the provider's per-request price); model calls are priced from tokens. */
  cents?: number;
  cacheHit?: boolean;
  ok?: boolean;
  /** Why it didn't run or failed: "not-configured", "quota", "error: …". */
  error?: string;
}

/** A sale id from a request body (`esp_…`), or undefined for anything else. */
export function saleIdOf(value: unknown): string | undefined {
  return typeof value === "string" && /^[\w-]{1,80}$/.test(value) ? value : undefined;
}

/**
 * The price entry for a model id. Vendors answer with dated ids ("gpt-5-nano-2025-08-07"), so
 * the longest table key the id starts with wins.
 */
export function priceFor(model: string | undefined): { input: number; output: number } | null {
  if (!model) return null;
  const key = Object.keys(MODEL_PRICES)
    .filter((k) => model === k || model.startsWith(`${k}-`))
    .sort((a, b) => b.length - a.length)[0];
  return key ? MODEL_PRICES[key] : null;
}

/** Estimated cents for a model call; an unknown model costs 0 and says so in the log. */
export function modelCents(model: string | undefined, inputTokens = 0, outputTokens = 0): number {
  const price = priceFor(model);
  if (!price) {
    if (model && model !== "fixture") console.warn(`[esp costs] no price for model ${model}; recorded as 0¢`);
    return 0;
  }
  // USD per million tokens → cents.
  return ((inputTokens * price.input + outputTokens * price.output) / 1_000_000) * 100;
}

/** The row as written; exported so a test can pin it. */
export function costRow(input: CostInput) {
  const cents = input.cents ?? modelCents(input.model, input.inputTokens, input.outputTokens);
  return {
    experiment_id: EXPERIMENT_ID,
    session_id: input.sessionId ?? null,
    sale_id: input.saleId ?? null,
    kind: input.kind,
    provider: input.provider ?? null,
    model: input.model ?? null,
    input_tokens: input.inputTokens ?? null,
    output_tokens: input.outputTokens ?? null,
    cents: Math.round(cents * 10_000) / 10_000,
    cache_hit: input.cacheHit ?? false,
    ok: input.ok ?? true,
    error: input.error ? input.error.slice(0, 300) : null,
  };
}

/**
 * Record after the response is sent. On Vercel a bare un-awaited promise can be cut off when
 * the function freezes; `after()` keeps it alive. Outside a request (tests, scripts) `after`
 * throws, and the write simply runs in the background.
 */
export function deferCost(input: CostInput): void {
  try {
    after(() => recordCost(input));
  } catch {
    void recordCost(input);
  }
}

/** Write one cost row. Never throws; resolves to where it went. */
export async function recordCost(
  input: CostInput,
  db: SupabaseClient | null = createAdminSupabaseClient(),
): Promise<"db" | "log" | "failed"> {
  try {
    const row = costRow(input);
    if (!db) {
      console.info(`[esp costs] ${JSON.stringify(row)}`);
      return "log";
    }
    const { error } = await db.from("esp_costs").insert(row);
    if (error) throw error;
    return "db";
  } catch (error: unknown) {
    console.error(`[esp costs] couldn't record a ${input.kind} row:`, messageOf(error));
    return "failed";
  }
}
