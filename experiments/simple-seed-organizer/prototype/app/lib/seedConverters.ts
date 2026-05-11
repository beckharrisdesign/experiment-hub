import {
  Seed,
  SeedCustomFieldValue,
  SeedInstructionAnnotation,
  SeedRawPacketText,
} from "@/types/seed";

type DbSeed = Record<string, any>;

interface ConvertOptions {
  mode: "insert" | "update";
}

const FIELD_TO_COLUMN: Array<[keyof Seed, string]> = [
  ["id", "id"],
  ["name", "name"],
  ["variety", "variety"],
  ["type", "type"],
  ["brand", "brand"],
  ["source", "source"],
  ["year", "year"],
  ["purchaseDate", "purchase_date"],
  ["quantity", "quantity"],
  ["daysToGermination", "days_to_germination"],
  ["daysToMaturity", "days_to_maturity"],
  ["plantingDepth", "planting_depth"],
  ["spacing", "spacing"],
  ["sunRequirement", "sun_requirement"],
  ["plantingMonths", "planting_months"],
  ["description", "description"],
  ["plantingInstructions", "planting_instructions"],
  ["notes", "notes"],
  ["customFields", "custom_fields"],
  ["instructionAnnotations", "instruction_annotations"],
  ["rawPacketText", "raw_packet_text"],
  ["photoFrontPath", "photo_front_path"],
  ["photoBackPath", "photo_back_path"],
  ["photoFront", "photo_front"],
  ["photoBack", "photo_back"],
  ["useFirst", "use_first"],
  ["customExpirationDate", "custom_expiration_date"],
  ["createdAt", "created_at"],
  ["updatedAt", "updated_at"],
];

const JSON_FIELD_KEYS = new Set<keyof Seed>([
  "plantingMonths",
  "customFields",
  "instructionAnnotations",
  "rawPacketText",
]);

export const SEEDS_COLUMNS_WITHOUT_PHOTOS = [
  "id",
  "user_id",
  "name",
  "variety",
  "type",
  "brand",
  "source",
  "year",
  "purchase_date",
  "quantity",
  "days_to_germination",
  "days_to_maturity",
  "planting_depth",
  "spacing",
  "sun_requirement",
  "planting_months",
  "description",
  "planting_instructions",
  "notes",
  "custom_fields",
  "instruction_annotations",
  "raw_packet_text",
  "use_first",
  "custom_expiration_date",
  "created_at",
  "updated_at",
].join(",");

export function convertSeedToDbSeed(
  seed: Partial<Seed>,
  options: ConvertOptions = { mode: "insert" },
): DbSeed {
  const dbSeed: DbSeed = {};

  for (const [seedKey, dbKey] of FIELD_TO_COLUMN) {
    if (seedKey === "photoFront" && seed.photoFrontPath) {
      if (options.mode === "insert" || seed.photoFront !== undefined) {
        dbSeed[dbKey] = null;
      }
      continue;
    }
    if (seedKey === "photoBack" && seed.photoBackPath) {
      if (options.mode === "insert" || seed.photoBack !== undefined) {
        dbSeed[dbKey] = null;
      }
      continue;
    }

    if (!Object.prototype.hasOwnProperty.call(seed, seedKey)) {
      if (options.mode === "insert" && nullableInsertColumn(seedKey)) {
        dbSeed[dbKey] = null;
      }
      continue;
    }

    const value = seed[seedKey];
    if (value === undefined || value === "") {
      if (options.mode === "insert" || value === "") {
        dbSeed[dbKey] = null;
      }
      continue;
    }

    if (seedKey === "useFirst") {
      dbSeed[dbKey] = Boolean(value);
    } else if (seedKey === "plantingMonths") {
      dbSeed[dbKey] = Array.isArray(value) && value.length > 0 ? JSON.stringify(value) : null;
    } else if (JSON_FIELD_KEYS.has(seedKey)) {
      dbSeed[dbKey] = serializeJsonValue(value);
    } else {
      dbSeed[dbKey] = value;
    }
  }

  return dbSeed;
}

export function convertDbSeedToSeed(
  dbSeed: DbSeed,
  photoFront?: string,
  photoBack?: string,
): Seed {
  return {
    id: dbSeed.id,
    user_id: dbSeed.user_id || undefined,
    name: dbSeed.name,
    variety: dbSeed.variety,
    type: dbSeed.type,
    brand: dbSeed.brand || undefined,
    source: dbSeed.source || undefined,
    year: dbSeed.year || undefined,
    purchaseDate: dbSeed.purchase_date || undefined,
    quantity: dbSeed.quantity || undefined,
    daysToGermination: dbSeed.days_to_germination || undefined,
    daysToMaturity: dbSeed.days_to_maturity || undefined,
    plantingDepth: dbSeed.planting_depth || undefined,
    spacing: dbSeed.spacing || undefined,
    sunRequirement: dbSeed.sun_requirement || undefined,
    plantingMonths: parseJsonArray<number>(dbSeed.planting_months),
    description: dbSeed.description || undefined,
    plantingInstructions: dbSeed.planting_instructions || undefined,
    notes: dbSeed.notes || undefined,
    customFields: parseJsonArray<SeedCustomFieldValue>(dbSeed.custom_fields),
    instructionAnnotations: parseJsonArray<SeedInstructionAnnotation>(
      dbSeed.instruction_annotations,
    ),
    rawPacketText: parseJsonArray<SeedRawPacketText>(dbSeed.raw_packet_text),
    photoFront: photoFront || dbSeed.photo_front || undefined,
    photoBack: photoBack || dbSeed.photo_back || undefined,
    photoFrontPath: dbSeed.photo_front_path || undefined,
    photoBackPath: dbSeed.photo_back_path || undefined,
    useFirst: dbSeed.use_first || undefined,
    customExpirationDate: dbSeed.custom_expiration_date || undefined,
    createdAt: dbSeed.created_at,
    updatedAt: dbSeed.updated_at,
  };
}

function nullableInsertColumn(seedKey: keyof Seed): boolean {
  return !["id", "name", "variety", "type", "createdAt", "updatedAt"].includes(
    seedKey,
  );
}

function serializeJsonValue(value: unknown): unknown {
  if (value == null) return null;
  if (Array.isArray(value) && value.length === 0) return null;
  return value;
}

function parseJsonArray<T>(value: unknown): T[] | undefined {
  if (value == null || value === "") return undefined;
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== "string") return undefined;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.length > 0
      ? (parsed as T[])
      : undefined;
  } catch {
    return undefined;
  }
}
