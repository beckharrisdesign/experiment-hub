import { AIExtractedData } from "@/lib/packetReaderAI";
import { normalizeSunRequirement } from "@/lib/seedUtils";
import { Seed } from "@/types/seed";

interface BuildSeedPayloadOptions {
  seedId: string;
  extracted: AIExtractedData;
  photoFrontPath?: string;
  photoBackPath?: string;
  photoFront?: string;
}

interface MergeOptions {
  replaceExistingPacketFacts: boolean;
}

const PACKET_FACT_KEYS = [
  "name",
  "variety",
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

export function buildSeedPayloadFromExtracted({
  seedId,
  extracted,
  photoFrontPath,
  photoBackPath,
  photoFront,
}: BuildSeedPayloadOptions): Omit<Seed, "createdAt" | "updatedAt"> {
  const name = extracted.name?.trim() || "Unknown";
  const variety = (
    extracted.variety ||
    extracted.latinName ||
    extracted.name ||
    "Unknown"
  ).trim();

  return {
    id: seedId,
    name,
    variety,
    type: "other",
    brand: extracted.brand,
    year: extracted.year,
    quantity: extracted.quantity,
    daysToGermination: extracted.daysToGermination,
    daysToMaturity: extracted.daysToMaturity,
    plantingDepth: extracted.plantingDepth,
    spacing: extracted.spacing,
    sunRequirement: normalizeSunRequirement(extracted.sunRequirement),
    description: extracted.description,
    plantingInstructions: extracted.plantingInstructions,
    rawPacketText: extracted.rawKeyValuePairs,
    photoFrontPath,
    photoBackPath,
    photoFront,
  };
}

export function mergePacketFactsIntoSeed(
  existingSeed: Seed,
  extracted: AIExtractedData,
  options: MergeOptions,
): Seed {
  const next: Seed = {
    ...existingSeed,
    description: mergePacketValue(
      existingSeed.description,
      extracted.description,
      options,
    ),
    plantingInstructions: mergePacketValue(
      existingSeed.plantingInstructions,
      extracted.plantingInstructions,
      options,
    ),
    rawPacketText: extracted.rawKeyValuePairs ?? existingSeed.rawPacketText,
  };

  for (const key of PACKET_FACT_KEYS) {
    if (key === "description" || key === "plantingInstructions") continue;
    const incoming =
      key === "variety"
        ? extracted.variety ?? extracted.latinName
        : key === "sunRequirement"
          ? normalizeSunRequirement(extracted.sunRequirement)
          : extracted[key];

    if (incoming == null || incoming === "") continue;
    const current = next[key];
    if (!current || options.replaceExistingPacketFacts) {
      (next as unknown as Record<string, unknown>)[key] = incoming;
    }
  }

  return next;
}

function mergePacketValue<T>(
  current: T | undefined,
  incoming: T | undefined,
  options: MergeOptions,
): T | undefined {
  if (incoming == null || incoming === "") return current;
  if (current && !options.replaceExistingPacketFacts) return current;
  return incoming;
}
