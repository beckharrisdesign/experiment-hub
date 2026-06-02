import { SeedType } from "@/types/seed";

/**
 * Sensible, editable defaults for a *new* packet (seed-entry-defaults capability).
 *
 * The founder anchor: "offering up good defaults" — most of a packet is
 * predictable (it's a seed, bought this year), so pre-filling the common fields
 * turns a long form into a quick confirm-and-save.
 *
 * INVARIANT: defaults are suggestions, never silent overwrites. Callers apply a
 * default ONLY where the field is currently empty (see `applyDefaultIfEmpty`),
 * so user input and AI extraction values always win.
 *
 * Fields kept deliberately small and aligned with `lib/seedFieldRegistry.ts`
 * (`type` → identity, `year` → packet). New packets only — never on edit.
 */
export interface SeedEntryDefaults {
  type: SeedType;
  year: string;
}

/**
 * @param now Inject the current date so callers/tests stay deterministic.
 */
export function getEntryDefaults(now: Date = new Date()): SeedEntryDefaults {
  return {
    // Most catalogued packets are vegetables; matches the form's prior initial value.
    type: "vegetable",
    // "bought this year" — the single most predictable packet fact.
    year: String(now.getFullYear()),
  };
}

/**
 * Return `defaultValue` only when `current` is empty/whitespace; otherwise keep
 * `current` unchanged. This is the guard that makes defaults non-destructive.
 */
export function applyDefaultIfEmpty(
  current: string | undefined,
  defaultValue: string,
): string {
  return current && current.trim() ? current : defaultValue;
}
