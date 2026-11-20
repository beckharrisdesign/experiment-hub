/**
 * Three-way comparison for a document whose file changed in Drive.
 * openspec/changes/pdf-metadata-viewer-cloud — task 8.4; design.md D8;
 * drive-document-source spec, "A conflict resolves against the baseline".
 *
 * Three values per field: what the file said when editing started (the
 * baseline), what is staged here, and what the file in Drive says now. A field
 * needs a decision only when both sides changed it, to different values.
 * Everything else resolves on its own and is reported as resolved, not hidden.
 *
 * Pure: no I/O. The page and the resolve route both classify with this, so the
 * table shown and the result written cannot disagree.
 */
import type { MetadataValues } from "@/lib/pdf-embedded";

export const CONFLICT_FIELDS = ["title", "subject", "author", "keywords"] as const;
export type ConflictField = (typeof CONFLICT_FIELDS)[number];

type FieldValue = string | null | string[];

export type FieldState =
  /** Neither side changed it. */
  | "unchanged"
  /** Only you changed it: your value applies. */
  | "yours"
  /** Only Drive changed it: Drive's value applies. */
  | "drive"
  /** Both changed it to the same value. */
  | "agreed"
  /** Both changed it, differently: a decision is required. */
  | "conflict";

export interface FieldComparison {
  field: ConflictField;
  was: FieldValue;
  yours: FieldValue;
  inDrive: FieldValue;
  state: FieldState;
}

export type Choice = "yours" | "drive";
export type Choices = Partial<Record<ConflictField, Choice>>;

function same(a: FieldValue, b: FieldValue): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    // Keywords compare as a set, as pending does (design.md D2 amendment).
    const x = [...((a as string[] | null) ?? [])].sort();
    const y = [...((b as string[] | null) ?? [])].sort();
    return x.length === y.length && x.every((k, i) => k === y[i]);
  }
  return (a ?? null) === (b ?? null);
}

export function compareVersions(
  baseline: MetadataValues,
  staged: MetadataValues,
  drive: MetadataValues,
): FieldComparison[] {
  return CONFLICT_FIELDS.map((field) => {
    const was = baseline[field];
    const yours = staged[field];
    const inDrive = drive[field];
    const youChanged = !same(was, yours);
    const driveChanged = !same(was, inDrive);
    const state: FieldState = !youChanged && !driveChanged
      ? "unchanged"
      : youChanged && !driveChanged
        ? "yours"
        : !youChanged && driveChanged
          ? "drive"
          : same(yours, inDrive)
            ? "agreed"
            : "conflict";
    return { field, was, yours, inDrive, state };
  });
}

export interface ComparisonSummary {
  needDecision: number;
  applyWithoutConflict: number;
}

export function summarizeComparison(fields: FieldComparison[]): ComparisonSummary {
  return {
    needDecision: fields.filter((f) => f.state === "conflict").length,
    applyWithoutConflict: fields.filter((f) => f.state === "yours" || f.state === "drive" || f.state === "agreed")
      .length,
  };
}

export type Resolution =
  | { ok: true; values: MetadataValues }
  | { ok: false; undecided: ConflictField[] };

/**
 * The values to stage once the conflict is resolved: yours where only you
 * changed a field, Drive's where only Drive did, and the choice where both did.
 * Refuses rather than guessing when a conflicting field has no choice.
 */
export function resolveValues(fields: FieldComparison[], choices: Choices): Resolution {
  const undecided = fields
    .filter((f) => f.state === "conflict" && !choices[f.field])
    .map((f) => f.field);
  if (undecided.length > 0) return { ok: false, undecided };

  const pick = (f: FieldComparison): FieldValue => {
    switch (f.state) {
      case "yours":
        return f.yours;
      case "conflict":
        return choices[f.field] === "yours" ? f.yours : f.inDrive;
      default:
        // unchanged, drive, agreed: Drive's value is the right one in each.
        return f.inDrive;
    }
  };
  const byField = Object.fromEntries(fields.map((f) => [f.field, pick(f)])) as Record<
    ConflictField,
    FieldValue
  >;
  return {
    ok: true,
    values: {
      title: byField.title as string | null,
      subject: byField.subject as string | null,
      author: byField.author as string | null,
      keywords: (byField.keywords as string[] | null) ?? [],
    },
  };
}

/** Drive's values, discarding everything staged. */
export function driveValues(fields: FieldComparison[]): MetadataValues {
  const byField = Object.fromEntries(fields.map((f) => [f.field, f.inDrive]));
  return {
    title: (byField.title as string | null) ?? null,
    subject: (byField.subject as string | null) ?? null,
    author: (byField.author as string | null) ?? null,
    keywords: (byField.keywords as string[] | null) ?? [],
  };
}
