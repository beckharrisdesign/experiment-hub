/**
 * The person's profile — settings that belong to them, not to one sale. It is the body of the
 * "Account & profile" panel behind the header menu (esp-header-affordance).
 *
 * There are no accounts yet (review queue #50 is still PROPOSED), so the profile lives on the
 * device in localStorage, like saved walkthroughs. When sign-in lands it moves to the person's
 * row and this file keeps the same shape.
 *
 * First setting — the sold-price lookup threshold (review queue #59; founder, 2026-10-31:
 * "Tokenize that choice - and put it in my profile"). The default and the offered choices are
 * the `COMPS` token in config.ts. The lookup route must run `resolveLookupMinBand` on whatever
 * the device sends, so a tampered value can't drop the threshold below the lowest choice.
 */
import { COMPS } from "./config";
import { bandLow } from "./tally";

export type LookupMinBand = (typeof COMPS.minBandChoices)[number];

export interface Profile {
  /** Look up sold prices only for items in this band or higher. */
  lookupMinBand: LookupMinBand;
}

export const PROFILE_KEY = "esp:profile:v1";

export const DEFAULT_PROFILE: Profile = { lookupMinBand: COMPS.minBand };

export function isLookupMinBand(value: unknown): value is LookupMinBand {
  return typeof value === "string" && (COMPS.minBandChoices as readonly string[]).includes(value);
}

/** One of the offered thresholds, or the default. Use this anywhere the value crossed a wire. */
export function resolveLookupMinBand(value: unknown): LookupMinBand {
  return isLookupMinBand(value) ? value : COMPS.minBand;
}

/** "$100–$250" → "$100+": the threshold reads as where lookups start. */
export function lookupChoiceLabel(band: LookupMinBand): string {
  return `$${bandLow(band)!.toLocaleString("en-US")}+`;
}

/**
 * Whether an item's band is at or above the threshold, compared by each band's low end, so
 * bands saved before 2026-10-27 still answer. An unknown band never qualifies.
 */
export function bandMeetsLookup(band: string, minBand: LookupMinBand): boolean {
  const low = bandLow(band);
  return low !== null && low >= bandLow(minBand)!;
}

export function loadProfile(): Profile {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<Profile>) : {};
    return { lookupMinBand: resolveLookupMinBand(saved.lookupMinBand) };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(profile: Profile): void {
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Blocked storage: the choice holds for this visit, the next one starts at the default.
  }
}
