/**
 * Comps on the device (sold-comps design D7, D15, D23): which items can be checked, how a
 * result lands on one, what its button and band line say. Pure, so the store's fetch is the
 * only untested part. Lookups run only from the button; nothing here schedules one.
 *
 * A lookup is about the item's subject — its name, mark reading and lot size — not its band:
 * the comps set the band, so keying on the band would loop. The subject changing (a rename, a
 * re-read that renamed it, a message, a split or a lot) means the old result no longer applies.
 */
import { lookupChoiceLabel, resolveLookupMinBand } from "../profile";
import type { Session, SessionItem } from "../session";
import { bandForDollars } from "./band";
import { subjectKey } from "./normalize";
import type { SoldListing } from "./provider";
import { meetsLookupGate, type CompsSummary } from "./summary";

/** The last lookup for an item, and which subject it was for. */
export type ItemComps = Omit<CompsSummary, "status" | "detail"> & { status: Exclude<CompsSummary["status"], "gated" | "limited">; key: string; at: string };

type Subject = Pick<SessionItem, "name" | "markReading" | "lot">;

export function compsKey(item: Subject): string {
  return subjectKey({ name: item.name, markReading: item.markReading, lotCount: lotCount(item) });
}

export function lotCount(item: Pick<SessionItem, "lot">): number | undefined {
  return item.lot ? item.lot.parts.length : undefined;
}

const FAILED = new Set(["error", "quota", "not-configured"]);

/**
 * The band that decides eligibility: the one from before any sold prices. Sold prices can pull
 * an item under the threshold, and that mustn't stop it being checked again.
 */
export function gateBand(item: Pick<SessionItem, "band" | "bandSource" | "guessBand" | "picked">): string {
  if (item.bandSource === "picked" && item.picked) return item.picked.before.bandSource === "comps" ? (item.guessBand ?? item.picked.before.band) : item.picked.before.band;
  return item.bandSource === "comps" ? (item.guessBand ?? item.band) : item.band;
}

/** The sale the family picked, and the price it replaced. */
export interface PickedMatch {
  listing: SoldListing;
  before: { band: SessionItem["band"]; bandSource?: SessionItem["bandSource"] };
}

/**
 * Pick a sale as the most likely match, or tap it again to undo (D25). Only this sets a price
 * from sold listings: the listings are found by text, so a person compares the photos first.
 * Switching to another sale still undoes to the original price.
 */
export function togglePick(s: Session, itemId: string, listing: SoldListing): Session {
  return {
    ...s,
    items: s.items.map((i) => {
      if (i.id !== itemId) return i;
      if (i.picked?.listing.url === listing.url) {
        const { picked: _picked, bandSource: _source, ...rest } = i;
        return { ...rest, band: i.picked.before.band, ...(i.picked.before.bandSource ? { bandSource: i.picked.before.bandSource } : {}) };
      }
      const before = i.picked?.before ?? { band: i.band, ...(i.bandSource ? { bandSource: i.bandSource } : {}) };
      return { ...i, band: bandForDollars(Math.round(listing.priceCents / 100)), bandSource: "picked" as const, picked: { listing, before } };
    }),
  };
}

const MAX_SHOWN = 5;

/** The sales to offer: the check's first five in its order, always including one already picked. */
export function possibleMatches(matches: SoldListing[], picked: SoldListing | null | undefined): SoldListing[] {
  const top = matches.slice(0, MAX_SHOWN);
  if (!picked || top.some((l) => l.url === picked.url)) return top;
  return [picked, ...top].slice(0, MAX_SHOWN);
}

export function isEligible(item: SessionItem, minBand: unknown): boolean {
  return meetsLookupGate({ destination: item.destination, band: gateBand(item) }, minBand);
}

export interface CheckAction {
  label: string;
  disabled: boolean;
  caption: string | null;
}

const ONCE = `One check per item per day.`;

/** The item screen's button (D23), or null when this item can't be checked. */
export function checkAction(item: SessionItem, nextCheckAt: string | null, checking: boolean, minBand: unknown, now: number): CheckAction | null {
  if (!isEligible(item, minBand)) return null;
  if (checking) return { label: "Checking…", disabled: true, caption: ONCE };
  if (nextCheckAt && now < Date.parse(nextCheckAt)) {
    return { label: "Check sold prices", disabled: true, caption: `You can check this item again ${formatWhen(nextCheckAt)}.` };
  }
  if (item.rereadPending) return { label: "Check sold prices", disabled: true, caption: ONCE };
  if (item.comps && item.comps.key === compsKey(item) && FAILED.has(item.comps.status)) return { label: "Try again", disabled: false, caption: null };
  return { label: "Check sold prices", disabled: false, caption: ONCE };
}

/** "Nov 7 at 10:12 AM", in the device's own time zone. */
export function formatWhen(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${day} at ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

/** "Nov 7, 2026 at 10:12 AM", for a record that may be read long after. */
export function formatStamp(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${day} at ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

/**
 * A lookup came back. It lands only if the item is still the subject it was asked about, and it
 * never changes the price (D25): matches are found by text, so only a picked sale sets one. An
 * item priced by text before this rule goes back to the model's band. A gated or limited answer
 * changes nothing.
 */
export function applyComps(s: Session, itemId: string, key: string, summary: CompsSummary, now = new Date()): Session {
  const status = summary.status;
  if (status === "gated" || status === "limited") return s;
  return {
    ...s,
    items: s.items.map((i) => {
      if (i.id !== itemId || compsKey(i) !== key) return i;
      const comps: ItemComps = { ...summary, status, key, at: now.toISOString() };
      if (i.bandSource === "comps") return { ...i, comps, band: i.guessBand ?? i.band, bandSource: "guess" as const, guessBand: undefined };
      return { ...i, comps };
    }),
  };
}

export type BandLine =
  | { kind: "checking" }
  | { kind: "comps"; comps: ItemComps }
  | { kind: "family" }
  | { kind: "picked"; priceCents: number }
  | { kind: "why"; text: string };

const NOT_USED = "This didn't use today's check.";

/**
 * The band line under the name and price (D15, D23, D25): whose price this is, or what a check
 * found. It's blank for an eligible item with no result for this subject: the button right under
 * it says the rest. "Based on N sold" is only for items priced by text before D25.
 */
export function bandLine(item: SessionItem, checking: boolean, minBand: unknown): BandLine | null {
  if (item.bandSource === "family") return { kind: "family" };
  if (item.bandSource === "picked" && item.picked) return { kind: "picked", priceCents: item.picked.listing.priceCents };
  if (checking) return { kind: "checking" };
  const okComps = item.comps?.status === "ok" && item.comps.key === compsKey(item) ? item.comps : undefined;
  if (item.bandSource === "comps" && okComps) return { kind: "comps", comps: okComps };
  const text = whyNoComps(item, minBand);
  return text ? { kind: "why", text } : null;
}

/** Eligibility comes first: a past failure stops mattering once the item can't be looked up. */
function whyNoComps(item: SessionItem, minBand: unknown): string | null {
  if (item.destination !== "sell") return "Sold prices are only checked for items marked Sell.";
  if (!isEligible(item, minBand)) {
    return `Sold prices are only checked for items at ${lookupChoiceLabel(resolveLookupMinBand(minBand))}. You can change that in Account & profile.`;
  }
  // A re-read still landing may rename the item, so an old failure says nothing yet.
  if (item.rereadPending || item.comps?.key !== compsKey(item)) return null;
  switch (item.comps.status) {
    case "ok":
    case "too-few":
      // Says what's on show: the carousel stops at five.
      return matchesLine(Math.min(item.comps.matched ?? 0, MAX_SHOWN));
    case "error":
      return `Couldn't check sold prices. ${NOT_USED}`;
    case "quota":
      return `Sold-price checks have hit their limit. ${NOT_USED}`;
    case "not-configured":
      return "Sold-price checks aren't set up here yet.";
    default:
      return null;
  }
}

function matchesLine(n: number): string {
  if (n === 0) return "No possible matches found. The price is still the first estimate.";
  if (n === 1) return "1 possible match. Not priced until you pick it.";
  return `${n} possible matches. Not priced until you pick one.`;
}

/** "$40–$85", or "$40" when the range is one price. */
export function formatRange([lo, hi]: [number, number]): string {
  const d = (c: number) => `$${Math.round(c / 100).toLocaleString("en-US")}`;
  return lo === hi ? d(lo) : `${d(lo)}–${d(hi)}`;
}
