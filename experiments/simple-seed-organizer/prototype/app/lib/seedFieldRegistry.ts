import {
  Seed,
  SeedCustomFieldValue,
  SeedFieldValueType,
  SeedInstructionAnnotation,
} from "@/types/seed";

export type SeedFieldKey = keyof Seed | "legacyCatalogCode";
export type SeedFieldSourceCategory =
  | "packet_fact"
  | "user_note"
  | "instruction_annotation"
  | "system";
export type SeedFieldStatus = "active" | "hidden" | "retired";
export type SeedFieldGroup =
  | "identity"
  | "packet"
  | "growing"
  | "user"
  | "media"
  | "system";
export type SeedFieldInputControl =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "checkbox"
  | "select"
  | "month_list"
  | "photo";

export interface SeedFieldDefinition {
  key: SeedFieldKey;
  label: string;
  valueType: SeedFieldValueType;
  inputControl: SeedFieldInputControl;
  group: SeedFieldGroup;
  displayOrder: number;
  required?: boolean;
  editable?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  sourceCategory: SeedFieldSourceCategory;
  status: SeedFieldStatus;
}

export interface SeedFieldValidationResult {
  valid: boolean;
  message?: string;
}

export const CANONICAL_SEED_FIELDS: SeedFieldDefinition[] = [
  {
    key: "name",
    label: "Name",
    valueType: "short_text",
    inputControl: "text",
    group: "identity",
    displayOrder: 10,
    required: true,
    editable: true,
    searchable: true,
    sourceCategory: "packet_fact",
    status: "active",
  },
  {
    key: "variety",
    label: "Variety",
    valueType: "short_text",
    inputControl: "text",
    group: "identity",
    displayOrder: 20,
    required: true,
    editable: true,
    searchable: true,
    sourceCategory: "packet_fact",
    status: "active",
  },
  {
    key: "type",
    label: "Type",
    valueType: "single_select",
    inputControl: "select",
    group: "identity",
    displayOrder: 30,
    required: true,
    editable: true,
    filterable: true,
    sourceCategory: "packet_fact",
    status: "active",
  },
  {
    key: "brand",
    label: "Brand",
    valueType: "short_text",
    inputControl: "text",
    group: "packet",
    displayOrder: 40,
    editable: true,
    searchable: true,
    sourceCategory: "packet_fact",
    status: "active",
  },
  {
    key: "source",
    label: "Source",
    valueType: "short_text",
    inputControl: "text",
    group: "packet",
    displayOrder: 50,
    editable: true,
    searchable: true,
    sourceCategory: "user_note",
    status: "active",
  },
  {
    key: "year",
    label: "Year",
    valueType: "integer",
    inputControl: "number",
    group: "packet",
    displayOrder: 60,
    editable: true,
    filterable: true,
    sourceCategory: "packet_fact",
    status: "active",
  },
  {
    key: "purchaseDate",
    label: "Purchase date",
    valueType: "date",
    inputControl: "date",
    group: "packet",
    displayOrder: 70,
    editable: true,
    sourceCategory: "user_note",
    status: "active",
  },
  {
    key: "quantity",
    label: "Quantity",
    valueType: "short_text",
    inputControl: "text",
    group: "packet",
    displayOrder: 80,
    editable: true,
    searchable: true,
    sourceCategory: "packet_fact",
    status: "active",
  },
  {
    key: "daysToGermination",
    label: "Days to germination",
    valueType: "short_text",
    inputControl: "text",
    group: "growing",
    displayOrder: 90,
    editable: true,
    sourceCategory: "packet_fact",
    status: "active",
  },
  {
    key: "daysToMaturity",
    label: "Days to maturity",
    valueType: "short_text",
    inputControl: "text",
    group: "growing",
    displayOrder: 100,
    editable: true,
    sourceCategory: "packet_fact",
    status: "active",
  },
  {
    key: "plantingDepth",
    label: "Planting depth",
    valueType: "instruction_text",
    inputControl: "text",
    group: "growing",
    displayOrder: 110,
    editable: true,
    sourceCategory: "packet_fact",
    status: "active",
  },
  {
    key: "spacing",
    label: "Spacing",
    valueType: "instruction_text",
    inputControl: "text",
    group: "growing",
    displayOrder: 120,
    editable: true,
    searchable: true,
    sourceCategory: "packet_fact",
    status: "active",
  },
  {
    key: "sunRequirement",
    label: "Sun requirement",
    valueType: "single_select",
    inputControl: "text",
    group: "growing",
    displayOrder: 130,
    editable: true,
    filterable: true,
    sourceCategory: "packet_fact",
    status: "active",
  },
  {
    key: "plantingMonths",
    label: "Planting months",
    valueType: "month_list",
    inputControl: "month_list",
    group: "growing",
    displayOrder: 140,
    editable: true,
    filterable: true,
    sourceCategory: "packet_fact",
    status: "active",
  },
  {
    key: "description",
    label: "Packet description",
    valueType: "long_text",
    inputControl: "textarea",
    group: "packet",
    displayOrder: 150,
    editable: true,
    searchable: true,
    sourceCategory: "packet_fact",
    status: "active",
  },
  {
    key: "plantingInstructions",
    label: "Printed instructions",
    valueType: "instruction_text",
    inputControl: "textarea",
    group: "growing",
    displayOrder: 160,
    editable: true,
    searchable: true,
    sourceCategory: "packet_fact",
    status: "active",
  },
  {
    key: "notes",
    label: "Notes",
    valueType: "long_text",
    inputControl: "textarea",
    group: "user",
    displayOrder: 170,
    editable: true,
    searchable: true,
    sourceCategory: "user_note",
    status: "active",
  },
  {
    key: "photos",
    label: "Photos",
    valueType: "photo_reference",
    inputControl: "photo",
    group: "media",
    displayOrder: 180,
    editable: true,
    sourceCategory: "packet_fact",
    status: "active",
  },
  {
    key: "useFirst",
    label: "Use first",
    valueType: "boolean",
    inputControl: "checkbox",
    group: "system",
    displayOrder: 200,
    editable: true,
    filterable: true,
    sourceCategory: "system",
    status: "active",
  },
  {
    key: "customExpirationDate",
    label: "Custom expiration",
    valueType: "date",
    inputControl: "date",
    group: "system",
    displayOrder: 210,
    editable: true,
    sourceCategory: "user_note",
    status: "active",
  },
  {
    key: "createdAt",
    label: "Created",
    valueType: "date",
    inputControl: "date",
    group: "system",
    displayOrder: 220,
    editable: false,
    sourceCategory: "system",
    status: "active",
  },
  {
    key: "updatedAt",
    label: "Updated",
    valueType: "date",
    inputControl: "date",
    group: "system",
    displayOrder: 230,
    editable: false,
    sourceCategory: "system",
    status: "active",
  },
  {
    key: "legacyCatalogCode",
    label: "Legacy catalog code",
    valueType: "short_text",
    inputControl: "text",
    group: "packet",
    displayOrder: 900,
    editable: false,
    searchable: true,
    sourceCategory: "packet_fact",
    status: "retired",
  },
];

export const ANNOTATABLE_SEED_FIELD_KEYS: SeedFieldKey[] = [
  "spacing",
  "plantingDepth",
  "plantingInstructions",
];

export const AI_EXTRACTABLE_PACKET_FIELD_KEYS = [
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

export function getActiveSeedFields(): SeedFieldDefinition[] {
  return sortedFields(CANONICAL_SEED_FIELDS.filter((f) => f.status === "active"));
}

export function getEditableSeedFields(): SeedFieldDefinition[] {
  return sortedFields(
    CANONICAL_SEED_FIELDS.filter(
      (field) => field.status === "active" && field.editable !== false,
    ),
  );
}

export function getSearchableSeedFields(): SeedFieldDefinition[] {
  return sortedFields(
    CANONICAL_SEED_FIELDS.filter(
      (field) => field.status === "active" && field.searchable,
    ),
  );
}

export function getSeedFieldDefinition(
  key: SeedFieldKey | string,
): SeedFieldDefinition | undefined {
  return CANONICAL_SEED_FIELDS.find((field) => field.key === key);
}

export function getRetiredFieldsWithValues(
  seed: Seed,
): SeedFieldDefinition[] {
  return sortedFields(
    CANONICAL_SEED_FIELDS.filter(
      (field) => field.status === "retired" && hasValue(getSeedFieldValue(seed, field.key)),
    ),
  );
}

export function getSeedFieldValue(
  seed: Seed,
  key: SeedFieldKey | string,
): unknown {
  return (seed as unknown as Record<string, unknown>)[key];
}

export function getAnnotationForField(
  seed: Seed,
  key: SeedFieldKey | string,
): SeedInstructionAnnotation | undefined {
  return seed.instructionAnnotations?.find(
    (annotation) => annotation.fieldKey === key && annotation.note.trim(),
  );
}

export function getSearchableSeedValues(seed: Seed): string[] {
  const canonicalValues = getSearchableSeedFields()
    .map((field) => getSeedFieldValue(seed, field.key))
    .filter(hasValue)
    .map(stringifySearchValue);

  const customValues = (seed.customFields ?? [])
    .filter((field) => !field.hidden)
    .flatMap((field) => [field.label, stringifySearchValue(field.value)]);

  return [...canonicalValues, ...customValues];
}

export function seedMatchesSearch(seed: Seed, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return getSearchableSeedValues(seed).some((value) =>
    value.toLowerCase().includes(normalizedQuery),
  );
}

export function validateSeedFieldValue(
  key: SeedFieldKey | string,
  value: unknown,
): SeedFieldValidationResult {
  const field = getSeedFieldDefinition(key);
  if (!field || value == null || value === "") return { valid: true };

  return validateValueByType(field.valueType, value);
}

export function validateCustomFieldValue(
  field: Pick<SeedCustomFieldValue, "valueType">,
  value: unknown,
): SeedFieldValidationResult {
  return validateValueByType(field.valueType, value);
}

function validateValueByType(
  valueType: SeedFieldValueType,
  value: unknown,
): SeedFieldValidationResult {
  switch (valueType) {
    case "integer": {
      const num = typeof value === "number" ? value : Number(value);
      return Number.isInteger(num)
        ? { valid: true }
        : { valid: false, message: "Use a whole number." };
    }
    case "date":
      return typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)
        ? { valid: true }
        : { valid: false, message: "Use YYYY-MM-DD format." };
    case "boolean":
      return typeof value === "boolean"
        ? { valid: true }
        : { valid: false, message: "Use true or false." };
    case "month_list":
      return Array.isArray(value) &&
        value.every((month) => Number.isInteger(month) && month >= 1 && month <= 12)
        ? { valid: true }
        : { valid: false, message: "Use month numbers from 1 to 12." };
    default:
      return { valid: true };
  }
}

function sortedFields(fields: SeedFieldDefinition[]): SeedFieldDefinition[] {
  return [...fields].sort((a, b) => a.displayOrder - b.displayOrder);
}

function hasValue(value: unknown): boolean {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function stringifySearchValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(" ");
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}
