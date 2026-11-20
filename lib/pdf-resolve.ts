/**
 * Load and resolve a conflict between staged edits and a changed Drive file.
 * openspec/changes/pdf-metadata-viewer-cloud — task 8.4; design.md D8.
 *
 * Loading reads Drive and changes nothing: opening Compare, or the new version,
 * is a look, not a resolution. Resolving is the only path that re-baselines,
 * and only after the user picked an outcome.
 */
import {
  getPdfAdminClient,
  getPdfDocument,
  type PdfDocument,
} from "@/lib/pdf-documents";
import {
  downloadDriveFile,
  getDriveRevision,
  getValidAccessToken,
} from "@/lib/pdf-drive";
import { readEmbeddedMetadata, type EmbeddedMetadata, type MetadataValues } from "@/lib/pdf-embedded";
import {
  compareVersions,
  driveValues,
  resolveValues,
  type Choices,
  type ConflictField,
  type FieldComparison,
} from "@/lib/pdf-conflict";
import { commitPdfDocument, discardPdfEdits, type CommitResult } from "@/lib/pdf-commit";
import { DriveFileUnstable } from "@/lib/pdf-staging";
import { clearAttention } from "@/lib/pdf-attention";

export interface DriveVersion {
  revision: string | null;
  modifiedTime: string | null;
  embedded: EmbeddedMetadata;
}

const READ_ATTEMPTS = 3;

/** What the file in Drive says now, pinned to one revision (as readBaseline is). */
export async function readDriveVersion(driveFileId: string): Promise<DriveVersion> {
  const accessToken = await getValidAccessToken();
  for (let attempt = 0; attempt < READ_ATTEMPTS; attempt++) {
    const before = await getDriveRevision(accessToken, driveFileId);
    const bytes = await downloadDriveFile(accessToken, driveFileId);
    const after = await getDriveRevision(accessToken, driveFileId);
    if (before.revision === after.revision) {
      return {
        revision: after.revision,
        modifiedTime: after.modifiedTime,
        embedded: await readEmbeddedMetadata(bytes),
      };
    }
  }
  throw new DriveFileUnstable("The file kept changing in Drive while it was being read");
}

function valuesOf(source: MetadataValues): MetadataValues {
  return {
    title: source.title,
    subject: source.subject,
    author: source.author,
    keywords: source.keywords,
  };
}

export type Comparison =
  | { kind: "nothing-pending"; document: PdfDocument }
  | { kind: "no-conflict"; document: PdfDocument; drive: DriveVersion }
  | {
      kind: "conflict";
      document: PdfDocument;
      drive: DriveVersion;
      fields: FieldComparison[];
      /** The page count moved: the edits may describe a different document. */
      pages: { was: number; now: number } | null;
    };

/** Null when there is no such document. Reads Drive; writes nothing. */
export async function loadComparison(id: string): Promise<Comparison | null> {
  const document = await getPdfDocument(id);
  if (!document) return null;
  const baseline = document.fileBaseline;
  if (!document.hasPendingEdits || !baseline) return { kind: "nothing-pending", document };

  const drive = await readDriveVersion(document.driveFileId);
  if (drive.revision === document.driveRevisionId) {
    return { kind: "no-conflict", document, drive };
  }
  return {
    kind: "conflict",
    document,
    drive,
    fields: compareVersions(valuesOf(baseline), valuesOf(document), valuesOf(drive.embedded)),
    pages:
      drive.embedded.pageCount !== baseline.pageCount
        ? { was: baseline.pageCount, now: drive.embedded.pageCount }
        : null,
  };
}

/** Drive moved again after the page was drawn: the choices were made against an old state. */
export class ComparisonStale extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ComparisonStale";
  }
}

/** The page count changed and the user has not said whether it is the same document. */
export class SameDocumentUnconfirmed extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SameDocumentUnconfirmed";
  }
}

/** A conflicting field arrived without a choice. */
export class UndecidedFields extends Error {
  constructor(public readonly fields: ConflictField[]) {
    super(`No choice for: ${fields.join(", ")}`);
    this.name = "UndecidedFields";
  }
}

export interface ResolveInput {
  action: "commit" | "discard";
  choices: Choices;
  /** The Drive revision the page compared against. */
  seenRevision: string | null;
  /** The user confirmed a changed page count is still the same document. */
  sameDocument: boolean;
}

export type ResolveResult =
  | { status: "discarded"; document: PdfDocument }
  | CommitResult;

/**
 * Resolve a conflict. `discard` takes Drive's version as it is now; `commit`
 * stages the settled values against Drive's version and writes them. Null when
 * there is no such document.
 */
export async function resolveConflict(
  id: string,
  input: ResolveInput,
): Promise<ResolveResult | null> {
  const comparison = await loadComparison(id);
  if (!comparison) return null;

  // No conflict any more (resolved elsewhere, or nothing pending): fall back to
  // the ordinary paths, which carry their own checks.
  if (comparison.kind !== "conflict") {
    if (input.action === "commit") {
      const result = await commitPdfDocument(id);
      return result;
    }
    const document = await discardPdfEdits(id);
    return document ? { status: "discarded", document } : null;
  }

  if (comparison.drive.revision !== input.seenRevision) {
    throw new ComparisonStale("The file changed in Drive again since this page was drawn");
  }

  let values: MetadataValues;
  if (input.action === "discard") {
    values = driveValues(comparison.fields);
  } else {
    if (comparison.pages && !input.sameDocument) {
      throw new SameDocumentUnconfirmed(
        "The page count changed. Confirm it is still the same document first.",
      );
    }
    const resolved = resolveValues(comparison.fields, input.choices);
    if (!resolved.ok) throw new UndecidedFields(resolved.undecided);
    values = resolved.values;
  }

  const { error } = await getPdfAdminClient().rpc("pdf_rebaseline", {
    doc: id,
    expected_revision: comparison.document.driveRevisionId,
    baseline: { revision: comparison.drive.revision, embedded: comparison.drive.embedded },
    vals: values,
  });
  if (error) {
    if (error.code === "40001") {
      throw new ComparisonStale("This document was resolved or committed meanwhile");
    }
    if (error.code === "P0002") return null;
    throw new Error(`Failed to resolve conflict: ${error.message}`);
  }

  // The conflict is resolved: the edits now sit on Drive's current version. If
  // the commit below fails, it records its own instance.
  await clearAttention(id);
  if (input.action === "discard") {
    const document = await getPdfDocument(id);
    return document ? { status: "discarded", document } : null;
  }
  return commitPdfDocument(id);
}
