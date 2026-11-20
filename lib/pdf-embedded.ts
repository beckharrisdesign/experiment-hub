/**
 * Read the metadata a PDF carries inside itself.
 * openspec/changes/pdf-metadata-viewer-cloud — design.md D0.
 *
 * This is the "In the file" value on the detail page: what Drive's copy says
 * today, as opposed to what the working store holds. Read-only — nothing here
 * writes, and `updateMetadata: false` stops pdf-lib stamping its own producer
 * and dates onto the in-memory copy, which would otherwise read back as if the
 * file said so.
 */
import { PDFDocument } from "pdf-lib";

export interface EmbeddedMetadata {
  title: string | null;
  subject: string | null;
  author: string | null;
  keywords: string[];
  pageCount: number;
}

/**
 * Split a stored keyword string into tags.
 *
 * pdf-lib writes keywords joined on a space (D0); other tools commonly use
 * commas or semicolons, and then a single keyword may itself contain a space
 * ("Smith Jane"). So a string carrying either delimiter is split on those
 * alone, and only a delimiter-free string falls back to whitespace — which is
 * lossless for this archive's own tags, every one a space-free slug.
 */
export function splitKeywords(raw: string | undefined | null): string[] {
  if (!raw) return [];
  const delimiter = /[,;]/.test(raw) ? /[,;]+/ : /\s+/;
  return raw
    .split(delimiter)
    .map((k) => k.trim())
    .filter(Boolean);
}

/**
 * Whether a staged keyword list says something different from the file's.
 *
 * Order-insensitive: the detail view shows tags as a set, so a reorder alone is
 * not a discrepancy worth an "In the file" line.
 */
export function keywordsDiffer(stored: string[], inFile: string[]): boolean {
  if (stored.length !== inFile.length) return true;
  const a = [...stored].sort();
  const b = [...inFile].sort();
  return a.some((k, i) => k !== b[i]);
}

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function readEmbeddedMetadata(
  bytes: ArrayBuffer | Uint8Array,
): Promise<EmbeddedMetadata> {
  const pdf = await PDFDocument.load(bytes, {
    // Scans from some copiers carry an owner password with no user password:
    // readable by anyone, but pdf-lib refuses them unless told otherwise.
    ignoreEncryption: true,
    updateMetadata: false,
  });

  return {
    title: clean(pdf.getTitle()),
    subject: clean(pdf.getSubject()),
    author: clean(pdf.getAuthor()),
    keywords: splitKeywords(pdf.getKeywords()),
    pageCount: pdf.getPageCount(),
  };
}
