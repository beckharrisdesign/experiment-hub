import {
  Seed,
  SeedCustomFieldValue,
  SeedInstructionAnnotation,
  SeedPhoto,
  SeedRawPacketText,
} from "@/types/seed";
import { resolvePhotoSrc } from "./seed-photos";

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
  ["myNotes", "my_notes"],
  ["hiddenFields", "hidden_fields"],
  ["customFields", "custom_fields"],
  ["instructionAnnotations", "instruction_annotations"],
  ["rawPacketText", "raw_packet_text"],
  ["photos", "photos"],
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

/** DB columns are JSONB NOT NULL DEFAULT '[]' — never send SQL null for these. */
const NOT_NULL_JSON_ARRAY_KEYS = new Set<keyof Seed>([
  "customFields",
  "instructionAnnotations",
  "rawPacketText",
]);

/** DB columns that are NOT NULL with empty array / empty text array default on insert when omitted. */
const NOT_NULL_INSERT_ARRAY_KEYS = new Set<keyof Seed>([
  ...NOT_NULL_JSON_ARRAY_KEYS,
  "hiddenFields",
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
  "my_notes",
  "hidden_fields",
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
        dbSeed[dbKey] = NOT_NULL_INSERT_ARRAY_KEYS.has(seedKey) ? [] : null;
      }
      continue;
    }

    const value = seed[seedKey];
    if (value === undefined || value === "") {
      if (options.mode === "insert" || value === "") {
        dbSeed[dbKey] = NOT_NULL_INSERT_ARRAY_KEYS.has(seedKey) ? [] : null;
      }
      continue;
    }

    if (seedKey === "photos") {
      // jsonb, nullable — empty/absent persists as NULL (= legacy, read via shim).
      dbSeed[dbKey] = Array.isArray(value) && value.length > 0 ? value : null;
    } else if (seedKey === "hiddenFields") {
      dbSeed[dbKey] = Array.isArray(value) && value.length > 0 ? value : [];
    } else if (seedKey === "useFirst") {
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
    plantingMonths: parsePlantingMonths(dbSeed.planting_months),
    description: dbSeed.description || undefined,
    plantingInstructions: dbSeed.planting_instructions || undefined,
    notes: dbSeed.notes || undefined,
    myNotes: dbSeed.my_notes || undefined,
    hiddenFields: parseTextArray(dbSeed.hidden_fields),
    customFields: parseJsonArray<SeedCustomFieldValue>(dbSeed.custom_fields),
    instructionAnnotations: parseJsonArray<SeedInstructionAnnotation>(
      dbSeed.instruction_annotations,
    ),
    rawPacketText: parseJsonArray<SeedRawPacketText>(dbSeed.raw_packet_text),
    photos: buildPhotoCollection(dbSeed, photoFront, photoBack),
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

/**
 * Lazy read-time shim: produce the canonical photo collection for a row.
 * - If the `photos` jsonb column is populated, it is authoritative (paths resolved to src).
 * - Otherwise synthesize from legacy front/back, preferring the display URLs storage
 *   already resolved (photoFront/photoBack) and falling back to row paths / base64.
 * Legacy ids (`legacy-front`/`legacy-back`) mark a row that save will upgrade in place.
 */
export function buildPhotoCollection(
  dbSeed: DbSeed,
  photoFront?: string,
  photoBack?: string,
): SeedPhoto[] | undefined {
  const fromColumn = parseJsonArray<SeedPhoto>(dbSeed.photos);
  if (fromColumn && fromColumn.length > 0) {
    return fromColumn
      .map((photo, index) => ({
        id: photo.id,
        path: resolvePhotoSrc(photo.path) ?? photo.path,
        order: typeof photo.order === "number" ? photo.order : index,
        label: photo.label,
      }))
      .sort((a, b) => a.order - b.order);
  }

  const frontSrc =
    photoFront || resolvePhotoSrc(dbSeed.photo_front_path) || dbSeed.photo_front || undefined;
  const backSrc =
    photoBack || resolvePhotoSrc(dbSeed.photo_back_path) || dbSeed.photo_back || undefined;

  const legacy: SeedPhoto[] = [];
  if (frontSrc) legacy.push({ id: "legacy-front", path: frontSrc, order: 0, label: "front" });
  if (backSrc) legacy.push({ id: "legacy-back", path: backSrc, order: 1, label: "back" });
  return legacy.length > 0 ? legacy : undefined;
}

function nullableInsertColumn(seedKey: keyof Seed): boolean {
  return !["id", "name", "variety", "type", "createdAt", "updatedAt"].includes(
    seedKey,
  );
}

function serializeJsonValue(value: unknown): unknown {
  if (value == null) return [];
  if (Array.isArray(value) && value.length === 0) return [];
  return value;
}

function parseTextArray(value: unknown): string[] | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) {
    const strings = value.filter((v): v is string => typeof v === "string");
    return strings.length > 0 ? strings : undefined;
  }
  return undefined;
}

function parseJsonArray<T>(value: unknown): T[] | undefined {
  if (value == null || value === "") return undefined;
  if (Array.isArray(value))
    return value.length > 0 ? (value as T[]) : undefined;
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

function parsePlantingMonths(value: unknown): number[] | undefined {
  if (value == null || value === "") return undefined;

  if (Array.isArray(value)) {
    const months = value.filter(isPlantingMonth);
    return months.length > 0 ? months : undefined;
  }

  if (typeof value !== "string") return undefined;

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      const months = parsed.filter(isPlantingMonth);
      return months.length > 0 ? months : undefined;
    }
  } catch {
    const months = value
      .split(",")
      .map((month) => Number(month.trim()))
      .filter(isPlantingMonth);
    if (months.length > 0) return months;

    console.warn("[Storage] Ignoring invalid planting_months value:", value);
  }

  return undefined;
}

function isPlantingMonth(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 12
  );
}
