import {
  CanonicalExtractionResult,
  CanonicalSeedMetadata,
  SEED_METADATA_FIELDS,
  SeedMetadataField,
  normalizeFieldValue,
} from "./packetExtraction";

export type FieldMatchType = "exact" | "normalized" | "missing" | "mismatch";

export interface SeedPacketFixture {
  name: string;
  description?: string;
  expected: CanonicalSeedMetadata;
  transcripts?: Record<string, string>;
  images?: Array<{
    id: string;
    label: string;
    path: string;
  }>;
  tolerances?: Partial<
    Record<
      SeedMetadataField,
      {
        match: "exact" | "normalized";
      }
    >
  >;
}

export interface FieldAccuracyResult {
  fixtureName: string;
  techniqueId: string;
  field: SeedMetadataField;
  expected: string;
  actual: string | undefined;
  match: FieldMatchType;
  passed: boolean;
}

export interface FixtureAccuracyReport {
  fixtureName: string;
  techniqueId: string;
  total: number;
  passed: number;
  failed: number;
  fields: FieldAccuracyResult[];
}

export function isLiveExtractionEvaluationEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.SEED_PACKET_LIVE_EVAL === "1";
}

export function scoreExtractionFixture(
  fixture: SeedPacketFixture,
  extraction: CanonicalExtractionResult,
  techniqueId: string,
): FixtureAccuracyReport {
  const fields = SEED_METADATA_FIELDS.flatMap((field) => {
    const expected = fixture.expected[field];
    if (expected == null) return [];

    const actualCandidate = extraction.fields[field];
    const actualValue = actualCandidate?.value;
    const normalizedExpected = normalizeFieldValue(field, expected);
    const normalizedActual =
      actualCandidate?.normalizedValue ??
      (actualValue == null ? undefined : normalizeFieldValue(field, actualValue));
    const requiredMatch = fixture.tolerances?.[field]?.match ?? "normalized";
    const match = compareFieldValues({
      expected,
      actual: actualValue,
      normalizedExpected,
      normalizedActual,
      requiredMatch,
    });

    return [
      {
        fixtureName: fixture.name,
        techniqueId,
        field,
        expected: String(expected),
        actual: actualValue == null ? undefined : String(actualValue),
        match,
        passed: match === "exact" || match === "normalized",
      },
    ];
  });

  const passed = fields.filter((field) => field.passed).length;
  return {
    fixtureName: fixture.name,
    techniqueId,
    total: fields.length,
    passed,
    failed: fields.length - passed,
    fields,
  };
}

export function formatAccuracyFailures(report: FixtureAccuracyReport): string {
  return report.fields
    .filter((field) => !field.passed)
    .map(
      (field) =>
        `${field.fixtureName} ${field.techniqueId} ${field.field}: expected "${field.expected}", got "${field.actual ?? "<missing>"}"`,
    )
    .join("\n");
}

function compareFieldValues({
  expected,
  actual,
  normalizedExpected,
  normalizedActual,
  requiredMatch,
}: {
  expected: unknown;
  actual: unknown;
  normalizedExpected: unknown;
  normalizedActual: unknown;
  requiredMatch: "exact" | "normalized";
}): FieldMatchType {
  if (actual == null || actual === "") return "missing";

  if (stringify(expected) === stringify(actual)) return "exact";
  if (
    requiredMatch === "normalized" &&
    normalizedExpected != null &&
    normalizedActual != null &&
    stringify(normalizedExpected) === stringify(normalizedActual)
  ) {
    return "normalized";
  }
  return "mismatch";
}

function stringify(value: unknown): string {
  return String(value).trim().toLowerCase();
}
