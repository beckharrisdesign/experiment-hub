/**
 * CompsAPI adapter — a third-party eBay sold-listings API (review queue #62). Everything here
 * is from https://compsapi.com/docs, read 2026-11-02, not memory:
 *
 * - `GET https://api.compsapi.com/v1/sold?q=…`, newest sale first; `days` defaults to 90.
 * - Auth: the `X-API-Key` header. A `User-Agent` is required or the firewall answers 403.
 * - Each item: `title`, `price` (a number, USD per unit actually paid), `last_sold` (ISO UTC),
 *   `url`, `image`.
 * - 429 is the monthly quota (`error: "quota_reached"`) or a burst past the per-minute rate.
 *   Every error body is `{ ok: false, error }`. Failed requests don't count against the quota.
 *
 * Not confirmed by the docs: they show a full body only for /v1/comps, where the list is a
 * top-level `items` array. The parser reads `items` and drops anything it can't read, so a
 * different shape degrades to "too few", never a crash. Check it on the first keyed call.
 */
import { COMPS, COMPS_PROVIDERS } from "../config";
import { messageOf } from "../errors";
import { ProviderError, type CompsProvider, type SoldListing } from "./provider";

const USER_AGENT = "bhd-labs-estate-sale-planner/1.0 (+https://beckharrisdesign.com)";

/** The request URL, exported so a test can pin it without a network. */
export function compsApiUrl(query: string): string {
  const params = new URLSearchParams({
    q: query.slice(0, 300),
    days: "90",
    // eBay US only: the default merges international sites, priced in converted dollars.
    site: "US",
    size: String(Math.max(10, COMPS.maxListings * 2)),
  });
  return `${COMPS_PROVIDERS.compsapi.url}?${params}`;
}

export function parseCompsApiItems(body: unknown): SoldListing[] {
  const items = (body as { items?: unknown })?.items;
  if (!Array.isArray(items)) return [];
  const out: SoldListing[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const { title, price, last_sold, url, image } = raw as Record<string, unknown>;
    const dollars = typeof price === "number" ? price : typeof price === "string" ? Number(price) : NaN;
    if (typeof title !== "string" || !title.trim() || !Number.isFinite(dollars) || dollars <= 0) continue;
    if (typeof url !== "string" || !/^https:\/\//.test(url)) continue;
    out.push({
      title: title.trim().slice(0, 200),
      priceCents: Math.round(dollars * 100),
      soldAt: typeof last_sold === "string" ? last_sold : "",
      url,
      ...(typeof image === "string" && /^https:\/\//.test(image) ? { image } : {}),
    });
  }
  return out;
}

export function compsApiProvider(apiKey: string, fetchImpl: typeof fetch = fetch): CompsProvider {
  return {
    name: "compsapi",
    pricePerRequestCents: COMPS_PROVIDERS.compsapi.pricePerRequestCents,
    async search(query, signal) {
      let response: Response;
      try {
        response = await fetchImpl(compsApiUrl(query), {
          headers: { "X-API-Key": apiKey, "User-Agent": USER_AGENT, accept: "application/json" },
          signal,
        });
      } catch (error: unknown) {
        const name = error instanceof Error ? error.name : "";
        const timedOut = name === "TimeoutError" || name === "AbortError";
        throw new ProviderError("error", timedOut ? "timeout" : `network: ${messageOf(error)}`);
      }
      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        // Fall through: a non-JSON body is an error below, or no items.
      }
      // Untrusted vendor JSON: read only the two fields the docs promise, and only as what they are.
      const fields = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
      const error = typeof fields.error === "string" ? fields.error.slice(0, 120) : undefined;
      if (response.status === 429 || error === "quota_reached") {
        throw new ProviderError("quota", error ?? "429");
      }
      if (!response.ok || fields.ok === false) {
        throw new ProviderError("error", `compsapi ${response.status}${error ? `: ${error}` : ""}`);
      }
      return parseCompsApiItems(body);
    },
  };
}
