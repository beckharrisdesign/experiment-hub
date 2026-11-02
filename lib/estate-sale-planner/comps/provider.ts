/**
 * One interface for sold-listings providers (sold-comps design D5). CompsAPI first; eBay
 * Marketplace Insights becomes a second adapter behind the same shape if it's granted.
 *
 * Server-only: the key never reaches the browser. With no key there is no provider and the
 * item keeps the model's band — there is no fixture provider in production; tests inject one.
 */
import { COMPS_PROVIDERS } from "../config";
import { compsApiProvider } from "./compsapi";

export interface SoldListing {
  title: string;
  priceCents: number;
  /** ISO 8601, UTC. */
  soldAt: string;
  url: string;
  image?: string;
}

export interface CompsProvider {
  /** "compsapi" — also the `esp_comps.provider` cache key. */
  name: string;
  /** For the cost ledger. */
  pricePerRequestCents: number;
  search(query: string, signal: AbortSignal): Promise<SoldListing[]>;
}

/** Why a lookup didn't come back; the route maps these to `CompsSummary.status`. */
export class ProviderError extends Error {
  constructor(public kind: "quota" | "error", message: string) {
    super(message);
    this.name = "ProviderError";
  }
}

export type ProviderName = keyof typeof COMPS_PROVIDERS;

export function providerFromEnv(env: Record<string, string | undefined> = process.env): CompsProvider | null {
  const key = env.COMPS_API_KEY?.trim();
  if (!key) return null;
  const name = (env.COMPS_PROVIDER?.trim() || "compsapi") as ProviderName;
  if (name === "compsapi") return compsApiProvider(key);
  console.error(`[esp comps] unknown COMPS_PROVIDER "${name}"; lookups are off`);
  return null;
}
