import type { ExtractedSeedData } from "./packetReader";
import { normalizeSunRequirement } from "./seedUtils";

export const SEED_METADATA_FIELDS = [
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

export type SeedMetadataField = (typeof SEED_METADATA_FIELDS)[number];
export type SeedMetadataValue = string | number | number[];
export type PacketImageLabel = "front" | "back" | "unknown" | string;
export type ExtractionTechniqueKind = "ocr" | "ai-vision" | "parser" | "pile";

export type CanonicalSeedMetadata = Partial<
  Record<SeedMetadataField, SeedMetadataValue>
>;

export interface PacketImageInput {
  id: string;
  label: PacketImageLabel;
  file?: File | string;
}

export interface ExtractionTechniqueMetadata {
  id: string;
  label: string;
  version: string;
  kind: ExtractionTechniqueKind;
  live?: boolean;
}

export interface PacketEvidenceReference {
  imageId?: string;
  imageLabel?: PacketImageLabel;
  text?: string;
  key?: string;
  value?: string;
  techniqueId?: string;
}

export interface ExtractionDiagnostic {
  level: "info" | "warning" | "error";
  message: string;
  field?: SeedMetadataField;
  techniqueId?: string;
}

export interface ExtractionFieldCandidate {
  field: SeedMetadataField;
  value: SeedMetadataValue;
  rawValue?: string;
  normalizedValue?: SeedMetadataValue;
  confidence: number;
  evidence: PacketEvidenceReference[];
  warnings?: string[];
  techniqueId: string;
}

export interface ExtractionAttempt {
  id: string;
  technique: ExtractionTechniqueMetadata;
  imageLabels: PacketImageLabel[];
  fields: ExtractionFieldCandidate[];
  diagnostics: ExtractionDiagnostic[];
  rawText?: string;
  rawOutput?: unknown;
  createdAt: string;
}

export interface CanonicalExtractionResult extends CanonicalSeedMetadata {
  fields: Partial<Record<SeedMetadataField, ExtractionFieldCandidate>>;
  alternatives: Partial<Record<SeedMetadataField, ExtractionFieldCandidate[]>>;
  diagnostics: ExtractionDiagnostic[];
  attempts: ExtractionAttempt[];
  rawKeyValuePairs?: Array<{
    key: string;
    value: string;
    evidence?: PacketEvidenceReference[];
  }>;
  confidence?: number;
}

type LegacyExtractedData = ExtractedSeedData & {
  latinName?: string;
  description?: string;
  plantingInstructions?: string;
  rawKeyValuePairs?: Array<{
    key: string;
    value: string;
    source?: "front" | "back";
  }>;
  fieldSources?: Record<string, "front" | "back">;
};

interface BuildAttemptOptions {
  attemptId: string;
  technique: ExtractionTechniqueMetadata;
  imageLabels?: PacketImageLabel[];
  confidence?: number;
  rawText?: string;
  rawOutput?: unknown;
  createdAt?: string;
}

export const TESSERACT_PARSE_TECHNIQUE: ExtractionTechniqueMetadata = {
  id: "tesseract-parse-v1",
  label: "Tesseract OCR + regex parser",
  version: "1",
  kind: "ocr",
  live: false,
};

export const OPENAI_VISION_SINGLE_TECHNIQUE: ExtractionTechniqueMetadata = {
  id: "openai-vision-single-v1",
  label: "OpenAI Vision single image",
  version: "1",
  kind: "ai-vision",
  live: true,
};

export const OPENAI_VISION_TWO_IMAGE_TECHNIQUE: ExtractionTechniqueMetadata = {
  id: "openai-vision-two-image-v1",
  label: "OpenAI Vision two image",
  version: "1",
  kind: "ai-vision",
  live: true,
};

export const OPENAI_PILE_IDENTIFICATION_TECHNIQUE: ExtractionTechniqueMetadata =
  {
    id: "openai-pile-identification-v1",
    label: "OpenAI pile packet identification",
    version: "1",
    kind: "pile",
    live: true,
  };

export function buildExtractionAttemptFromSeedData(
  data: LegacyExtractedData,
  options: BuildAttemptOptions,
): ExtractionAttempt {
  const imageLabels = options.imageLabels ?? ["unknown"];
  const confidence = clampConfidence(
    data.confidence ?? options.confidence ?? 0.5,
  );
  const fields = SEED_METADATA_FIELDS.flatMap((field) => {
    const value = data[field as keyof LegacyExtractedData];
    if (!hasExtractedValue(value)) return [];

    const rawValue = String(value);
    const evidenceLabel = data.fieldSources?.[field] ?? imageLabels[0];
    const candidate: ExtractionFieldCandidate = {
      field,
      value: value as SeedMetadataValue,
      rawValue,
      normalizedValue: normalizeFieldValue(field, value as SeedMetadataValue),
      confidence,
      evidence: [
        {
          imageLabel: evidenceLabel,
          text: rawValue,
          techniqueId: options.technique.id,
        },
      ],
      techniqueId: options.technique.id,
    };
    return [candidate];
  });

  return {
    id: options.attemptId,
    technique: options.technique,
    imageLabels,
    fields,
    diagnostics:
      fields.length > 0
        ? []
        : [
            {
              level: "warning",
              message: "No seed metadata fields were extracted.",
              techniqueId: options.technique.id,
            },
          ],
    rawText: options.rawText,
    rawOutput: options.rawOutput,
    createdAt: options.createdAt ?? new Date().toISOString(),
  };
}

export function resolveExtractionAttempts(
  attempts: ExtractionAttempt[],
  rawKeyValuePairs?: LegacyExtractedData["rawKeyValuePairs"],
): CanonicalExtractionResult {
  const fields: Partial<Record<SeedMetadataField, ExtractionFieldCandidate>> =
    {};
  const alternatives: Partial<
    Record<SeedMetadataField, ExtractionFieldCandidate[]>
  > = {};
  const diagnostics: ExtractionDiagnostic[] = attempts.flatMap(
    (attempt) => attempt.diagnostics,
  );

  for (const field of SEED_METADATA_FIELDS) {
    const candidates = attempts.flatMap((attempt) =>
      attempt.fields.filter((candidate) => candidate.field === field),
    );
    if (candidates.length === 0) continue;

    const sorted = [...candidates].sort(
      (a, b) => b.confidence - a.confidence,
    );
    const preferred = sorted[0];
    fields[field] = preferred;

    const otherCandidates = sorted.slice(1);
    if (otherCandidates.length > 0) {
      alternatives[field] = otherCandidates;
    }

    const distinctValues = new Set(
      sorted.map((candidate) => comparableValue(candidate)),
    );
    if (distinctValues.size > 1) {
      diagnostics.push({
        level: "warning",
        field,
        techniqueId: preferred.techniqueId,
        message: `Multiple candidate values found for ${field}; using the highest-confidence value.`,
      });
    }
  }

  const result: CanonicalExtractionResult = {
    fields,
    alternatives,
    diagnostics,
    attempts,
  };

  for (const field of SEED_METADATA_FIELDS) {
    const candidate = fields[field];
    if (candidate) {
      result[field] = candidate.value;
    }
  }

  if (rawKeyValuePairs?.length) {
    result.rawKeyValuePairs = rawKeyValuePairs.map((pair) => ({
      key: pair.key,
      value: pair.value,
      evidence: [
        {
          imageLabel: pair.source,
          key: pair.key,
          value: pair.value,
        },
      ],
    }));
  }

  const confidences = Object.values(fields).map(
    (candidate) => candidate.confidence,
  );
  if (confidences.length > 0) {
    result.confidence =
      confidences.reduce((sum, value) => sum + value, 0) / confidences.length;
  }

  return result;
}

export function buildCanonicalExtractionFromSeedData(
  data: LegacyExtractedData,
  options: BuildAttemptOptions,
): CanonicalExtractionResult {
  const attempt = buildExtractionAttemptFromSeedData(data, options);
  return resolveExtractionAttempts([attempt], data.rawKeyValuePairs);
}

export function canonicalExtractionToSeedData(
  extraction: CanonicalExtractionResult,
): LegacyExtractedData {
  const data: LegacyExtractedData = {};
  for (const field of SEED_METADATA_FIELDS) {
    const candidate = extraction.fields[field];
    if (!candidate) continue;
    (data as Record<string, unknown>)[field] = candidate.value;
  }
  data.confidence = extraction.confidence;
  if (extraction.rawKeyValuePairs?.length) {
    data.rawKeyValuePairs = extraction.rawKeyValuePairs.map((pair) => ({
      key: pair.key,
      value: pair.value,
      source: normalizeLegacySource(pair.evidence?.[0]?.imageLabel),
    }));
  }
  return data;
}

export function normalizeFieldValue(
  field: SeedMetadataField,
  value: SeedMetadataValue,
): SeedMetadataValue | undefined {
  if (field === "sunRequirement" && typeof value === "string") {
    return normalizeSunRequirement(value);
  }
  if (field === "year") {
    const year = typeof value === "number" ? value : parseInt(String(value));
    return Number.isFinite(year) ? year : undefined;
  }
  return value;
}

function hasExtractedValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.length > 0;
  return false;
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

function comparableValue(candidate: ExtractionFieldCandidate): string {
  const value = candidate.normalizedValue ?? candidate.value;
  return String(value).trim().toLowerCase();
}

function normalizeLegacySource(
  label: PacketImageLabel | undefined,
): "front" | "back" | undefined {
  if (label === "front" || label === "back") return label;
  return undefined;
}
