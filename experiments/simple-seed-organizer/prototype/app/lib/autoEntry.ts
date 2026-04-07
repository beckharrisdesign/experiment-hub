/**
 * Pure helpers for the "Auto Entry" feature in AddSeedForm.
 *
 * Extracted from the component so they can be unit-tested independently.
 * Both functions must remain free of React state — they are called inside
 * functional state updaters to guarantee they always see current state.
 */

import { AIExtractedData } from "./packetReaderAI";

const MERGED_FIELDS = [
  "name",
  "variety",
  "latinName",
  "brand",
  "year",
  "quantity",
  "daysToGermination",
  "daysToMaturity",
  "plantingDepth",
  "spacing",
  "sunRequirement",
  "description",
  "plantingInstructions",
] as const;

/**
 * Merge AI-extracted data from one image side into the existing accumulated
 * extraction result.
 *
 * Rules:
 * - Fields tagged to `side` in `incoming.fieldSources` are written to merged.
 * - For name/variety, the front-side value wins when both sides have one.
 * - rawKeyValuePairs for `side` replace any previous pairs for that side.
 * - This function is pure — it never mutates its arguments.
 */
export function mergeExtractedData(
  existing: AIExtractedData | null,
  incoming: AIExtractedData,
  side: "front" | "back",
): AIExtractedData {
  const merged: AIExtractedData = {
    ...(existing ?? {}),
    fieldSources: {
      ...(existing?.fieldSources ?? {}),
      ...(incoming.fieldSources ?? {}),
    },
    rawKeyValuePairs: [
      ...(existing?.rawKeyValuePairs ?? []).filter((p) => p.source !== side),
      ...(incoming.rawKeyValuePairs ?? []).filter((p) => p.source === side),
    ],
  };

  for (const f of MERGED_FIELDS) {
    const val = incoming[f];
    if (val == null || val === "") continue;
    // Only apply fields the AI attributed to this side
    if (incoming.fieldSources?.[f] !== side) continue;
    // Front wins for name/variety when both sides have a value
    if (
      (f === "name" || f === "variety") &&
      side === "back" &&
      existing?.fieldSources?.[f] === "front"
    )
      continue;
    (merged as Record<string, unknown>)[f] = val;
  }

  if (merged.rawKeyValuePairs?.length === 0)
    merged.rawKeyValuePairs = undefined;
  return merged;
}

/**
 * Return the value that a form field should take after an Auto Entry response.
 *
 * The rule is simple: **never overwrite a field the user has already filled**.
 * `currentValue` is the field's value at the time the updater runs (i.e. the
 * live state, NOT a closed-over snapshot). `aiValue` is what the AI returned.
 *
 * Call this inside a React functional state updater so `currentValue` is always
 * the latest state — never a stale closure:
 *
 *   setName(prev => fieldAfterAutoEntry(prev, data.name));
 */
export function fieldAfterAutoEntry(
  currentValue: string,
  aiValue: string | undefined,
): string {
  if (currentValue) return currentValue; // user has a value — keep it
  return aiValue ?? "";
}
