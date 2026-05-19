/**
 * Canonical packet fields that may be hidden per seed in edit/detail UI.
 * Name and variety are always required and are not hideable.
 */
export const HIDEABLE_SEED_FIELD_KEYS = [
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

export type HideableSeedFieldKey = (typeof HIDEABLE_SEED_FIELD_KEYS)[number];

const LABELS: Record<HideableSeedFieldKey, string> = {
  brand: "Brand",
  year: "Year",
  quantity: "Quantity",
  daysToGermination: "Days to Germination",
  daysToMaturity: "Days to Maturity",
  plantingDepth: "Planting Depth",
  spacing: "Spacing",
  sunRequirement: "Sun Requirement",
  description: "Packet description",
  plantingInstructions: "Printed instructions",
};

export function hideableFieldLabel(key: string): string {
  if ((HIDEABLE_SEED_FIELD_KEYS as readonly string[]).includes(key)) {
    return LABELS[key as HideableSeedFieldKey];
  }
  return key;
}

export function isHideableSeedFieldKey(key: string): key is HideableSeedFieldKey {
  return (HIDEABLE_SEED_FIELD_KEYS as readonly string[]).includes(key);
}
