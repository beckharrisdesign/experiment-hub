/**
 * Comps on the device (sold-comps tasks 3.24, design D7, D15): when an item's lookup is due,
 * how a result lands on it, and which band line it shows. Pure, so the store's timing is the
 * only untested part.
 *
 * A lookup is about the item's subject — its name, mark reading and lot size — not its band:
 * the comps set the band, so keying on the band would loop. The subject changing (a rename, a
 * re-read that renamed it, a message, a split or a lot) is what makes a new lookup due.
 */
import { COMPS } from "../config";
import { lookupChoiceLabel, resolveLookupMinBand } from "../profile";
import type { Session, SessionItem } from "../session";
import { subjectKey } from "./normalize";
import { meetsLookupGate, type CompsSummary } from "./summary";

/** The last lookup for an item, and which subject it was for. */
export type ItemComps = Omit<CompsSummary, "status"> & { status: Exclude<CompsSummary["status"], "gated">; key: string; at: string };

type Subject = Pick<SessionItem, "name" | "markReading" | "lot">;

export function compsKey(item: Subject): string {
  return subjectKey({ name: item.name, markReading: item.markReading, lotCount: lotCount(item) });
}

export function lotCount(item: Pick<SessionItem, "lot">): number | undefined {
  return item.lot ? item.lot.parts.length : undefined;
}

const RETRYABLE = new Set(["error", "quota", "not-configured"]);

function ready(item: SessionItem, minBand: unknown): boolean {
  return meetsLookupGate(item, minBand) && !item.rereadPending;
}

/**
 * Due when the item first meets the gate (set to Sell, or its band rises to the threshold,
 * including when a re-read lands) or its subject changed while gated. Not merely because a
 * sale was opened: an item that sat gated with no comps waits for its screen (`retryDue`).
 */
export function lookupDue(prev: SessionItem | undefined, next: SessionItem, minBand: unknown): boolean {
  if (!ready(next, minBand)) return false;
  const key = compsKey(next);
  if (next.comps?.key === key) return false;
  if (!prev || !ready(prev, minBand)) return true;
  return compsKey(prev) !== key;
}

/** On opening a gated item: run if it has never been looked up for this subject, or the last try failed. */
export function retryDue(item: SessionItem, minBand: unknown): boolean {
  if (!ready(item, minBand)) return false;
  return item.comps?.key !== compsKey(item) || RETRYABLE.has(item.comps.status);
}

/** Items in `next` whose lookup became due since `prev`. */
export function lookupsDue(prev: Session | null, next: Session, minBand: unknown): string[] {
  const before = prev?.id === next.id ? new Map(prev.items.map((i) => [i.id, i])) : new Map<string, SessionItem>();
  return next.items.filter((i) => lookupDue(before.get(i.id), i, minBand)).map((i) => i.id);
}

/**
 * A lookup came back. It lands only if the item is still the subject it was asked about. On
 * `ok` the band comes from the sales, unless the family set one: theirs stays and the comps
 * stay for reference. A gated answer (the threshold moved meanwhile) changes nothing.
 */
export function applyComps(s: Session, itemId: string, key: string, summary: CompsSummary, now = new Date()): Session {
  const status = summary.status;
  if (status === "gated") return s;
  return {
    ...s,
    items: s.items.map((i) => {
      if (i.id !== itemId || compsKey(i) !== key) return i;
      const comps: ItemComps = { ...summary, status, key, at: now.toISOString() };
      if (i.bandSource === "family") return { ...i, comps };
      // The model's band is kept aside so it can come back.
      const guessBand = i.bandSource === "comps" ? (i.guessBand ?? i.band) : i.band;
      if (status === "ok" && summary.band) return { ...i, comps, band: summary.band, bandSource: "comps" as const, guessBand };
      // No usable sales for this subject: a band set from an earlier subject's sales gives way to the model's.
      if (i.bandSource === "comps") return { ...i, comps, band: guessBand, bandSource: "guess" as const, guessBand: undefined };
      return { ...i, comps };
    }),
  };
}

export type BandLine =
  | { kind: "checking" }
  | { kind: "comps"; comps: ItemComps }
  | { kind: "family"; comps?: ItemComps }
  | { kind: "why"; text: string };

const RETRY = "It'll try again when you reopen this item.";

/**
 * The band line under the name and price (D15, D23): "Checking sold prices…", "Based on N sold"
 * or "Set by you", and otherwise why sold prices didn't set this price. It's blank only while a
 * lookup is about to run: a new subject waiting out its settle time, or a re-read still landing.
 */
export function bandLine(item: SessionItem, checking: boolean, minBand: unknown): BandLine | null {
  const okComps = item.comps?.status === "ok" && item.comps.key === compsKey(item) ? item.comps : undefined;
  if (item.bandSource === "family") return { kind: "family", ...(okComps ? { comps: okComps } : {}) };
  if (checking) return { kind: "checking" };
  if (item.bandSource === "comps" && okComps) return { kind: "comps", comps: okComps };
  const text = whyNoComps(item, minBand);
  return text ? { kind: "why", text } : null;
}

/** Eligibility comes first: a past failure stops mattering once the item can't be looked up. */
function whyNoComps(item: SessionItem, minBand: unknown): string | null {
  if (item.destination !== "sell") return "Sold prices are only checked for items marked Sell.";
  if (!meetsLookupGate(item, minBand)) {
    return `Sold prices are only checked for items at ${lookupChoiceLabel(resolveLookupMinBand(minBand))}. You can change that in Account & profile.`;
  }
  if (item.rereadPending || item.comps?.key !== compsKey(item)) return null;
  switch (item.comps.status) {
    case "too-few":
      return `${matchingSales(item.comps.matched ?? 0)} It takes ${COMPS.minMatches} to set the price.`;
    case "error":
      return `Couldn't check sold prices. ${RETRY}`;
    case "quota":
      return `Sold-price checks have hit their limit. ${RETRY}`;
    case "not-configured":
      return "Sold-price checks aren't set up here yet.";
    default:
      return null;
  }
}

function matchingSales(n: number): string {
  if (n === 0) return "Found no matching sales.";
  return `Found ${n} matching ${n === 1 ? "sale" : "sales"}.`;
}

/** "$40–$85", or "$40" when the range is one price. */
export function formatRange([lo, hi]: [number, number]): string {
  const d = (c: number) => `$${Math.round(c / 100).toLocaleString("en-US")}`;
  return lo === hi ? d(lo) : `${d(lo)}–${d(hi)}`;
}
