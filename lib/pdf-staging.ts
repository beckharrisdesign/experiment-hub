/**
 * Stage field edits on a document — saved here, not yet written to the PDF.
 * openspec/changes/pdf-metadata-viewer-cloud — tasks 1.6, 8.0, 8.1; design.md D2, D8.
 *
 * Staging never writes to Drive. It reads from Drive once, on the first edit
 * after nothing was pending, to capture the baseline: what the file said when
 * editing started, pinned to the revision those bytes came from.
 */
import { getPdfAdminClient, getPdfDocument, type PdfDocument } from "@/lib/pdf-documents";
import { DocumentReplaced } from "@/lib/pdf-split-plan";
import {
  downloadDriveFile,
  getDriveHeadRevisionId,
  getValidAccessToken,
} from "@/lib/pdf-drive";
import { readEmbeddedMetadata, type EmbeddedMetadata } from "@/lib/pdf-embedded";

export const TEXT_FIELDS = ["title", "subject", "author"] as const;
export type TextField = (typeof TEXT_FIELDS)[number];

export interface PdfEdits {
  title?: string | null;
  subject?: string | null;
  author?: string | null;
  keywords?: string[];
}

const MAX_TEXT = 1000;
const MAX_KEYWORD = 100;
const MAX_KEYWORDS = 100;

export type ParsedEdits = { ok: true; edits: PdfEdits } | { ok: false; error: string };

/**
 * Validate a request body into edits.
 *
 * Text is trimmed and an empty string clears the field. Keywords are trimmed and
 * de-duplicated in order, and one containing whitespace is refused rather than
 * repaired: pdf-lib joins keywords on a space, so "year 2026" would be read
 * back as two keywords (design.md D0, task 1.6).
 */
export function parseEdits(body: unknown): ParsedEdits {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Expected an object of fields to change" };
  }
  const input = body as Record<string, unknown>;
  const known = new Set<string>([...TEXT_FIELDS, "keywords"]);
  const unknown = Object.keys(input).filter((k) => !known.has(k));
  if (unknown.length > 0) {
    return { ok: false, error: `Unknown field: ${unknown[0]}` };
  }

  const edits: PdfEdits = {};
  for (const field of TEXT_FIELDS) {
    if (!(field in input)) continue;
    const value = input[field];
    if (value !== null && typeof value !== "string") {
      return { ok: false, error: `${field} must be text` };
    }
    const trimmed = value?.trim() ?? "";
    if (trimmed.length > MAX_TEXT) {
      return { ok: false, error: `${field} is longer than ${MAX_TEXT} characters` };
    }
    edits[field] = trimmed || null;
  }

  if ("keywords" in input) {
    const value = input.keywords;
    if (!Array.isArray(value) || value.some((k) => typeof k !== "string")) {
      return { ok: false, error: "keywords must be a list of text" };
    }
    const keywords: string[] = [];
    for (const raw of value as string[]) {
      const k = raw.trim();
      if (!k) continue;
      if (/\s/.test(k)) {
        return {
          ok: false,
          error: `Keywords can't contain spaces: "${k}". Use a hyphen instead, like ${k.replace(/\s+/g, "-")}.`,
        };
      }
      if (k.length > MAX_KEYWORD) {
        return { ok: false, error: `Keyword is longer than ${MAX_KEYWORD} characters` };
      }
      if (!keywords.includes(k)) keywords.push(k);
    }
    if (keywords.length > MAX_KEYWORDS) {
      return { ok: false, error: `More than ${MAX_KEYWORDS} keywords` };
    }
    edits.keywords = keywords;
  }

  if (Object.keys(edits).length === 0) {
    return { ok: false, error: "No fields to change" };
  }
  return { ok: true, edits };
}

export interface Baseline {
  revision: string | null;
  embedded: EmbeddedMetadata;
}

/** The file changed in Drive on every attempt to read it. */
export class DriveFileUnstable extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DriveFileUnstable";
  }
}

const BASELINE_ATTEMPTS = 3;

/**
 * Read what the file says now, pinned to one revision.
 *
 * The revision is read before and after the bytes. If the two differ, the file
 * changed mid-read and the bytes may belong to either revision, so the read is
 * repeated rather than recording a baseline that names the wrong version.
 */
export async function readBaseline(driveFileId: string): Promise<Baseline> {
  const accessToken = await getValidAccessToken();
  for (let attempt = 0; attempt < BASELINE_ATTEMPTS; attempt++) {
    const before = await getDriveHeadRevisionId(accessToken, driveFileId);
    const bytes = await downloadDriveFile(accessToken, driveFileId);
    const after = await getDriveHeadRevisionId(accessToken, driveFileId);
    if (before === after) {
      return { revision: after, embedded: await readEmbeddedMetadata(bytes) };
    }
  }
  throw new DriveFileUnstable("The file kept changing in Drive while it was being read");
}

/**
 * Stage edits. Returns the updated document, or null when there is no such
 * document. Drive errors from the baseline read propagate for the route to map.
 */
export async function stagePdfEdits(
  id: string,
  edits: PdfEdits,
): Promise<PdfDocument | null> {
  const document = await getPdfDocument(id);
  if (!document) return null;
  if (document.supersededAt) throw new DocumentReplaced();

  // While edits are pending the baseline stands; the function ignores one
  // passed anyway, so a request racing another's first edit is still safe.
  const baseline = document.hasPendingEdits
    ? null
    : await readBaseline(document.driveFileId);

  const { error } = await getPdfAdminClient().rpc("pdf_stage_edits", {
    doc: id,
    edits,
    baseline,
  });
  if (error) {
    // P0002: soft-deleted between the read above and the write.
    if (error.code === "P0002") return null;
    throw new Error(`Failed to stage edits: ${error.message}`);
  }

  return getPdfDocument(id);
}

/** A field's value differs from what the file said when editing started. */
export interface PendingSummary {
  fields: TextField[];
  keywordsAdded: string[];
  keywordsRemoved: string[];
  /** Edited text fields plus each keyword added or removed. */
  count: number;
}

/**
 * What is staged but not in the file, measured against the baseline.
 * A document never edited has no baseline and nothing pending.
 */
export function summarizePending(document: PdfDocument): PendingSummary {
  const baseline = document.fileBaseline;
  if (!baseline) {
    return { fields: [], keywordsAdded: [], keywordsRemoved: [], count: 0 };
  }
  const fields = TEXT_FIELDS.filter((f) => (document[f] ?? null) !== (baseline[f] ?? null));
  const keywordsAdded = document.keywords.filter((k) => !baseline.keywords.includes(k));
  const keywordsRemoved = baseline.keywords.filter((k) => !document.keywords.includes(k));
  return {
    fields,
    keywordsAdded,
    keywordsRemoved,
    count: fields.length + keywordsAdded.length + keywordsRemoved.length,
  };
}
