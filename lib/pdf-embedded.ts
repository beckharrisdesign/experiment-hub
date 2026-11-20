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

/** The file cannot be rewritten without damaging it. */
export class PdfNotWritable extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfNotWritable";
  }
}

export interface MetadataValues {
  title: string | null;
  subject: string | null;
  author: string | null;
  keywords: string[];
}

/**
 * Write the four fields into a copy of the PDF and return the new bytes.
 * openspec/changes/pdf-metadata-viewer-cloud — task 8.2, design.md D0, D4.
 *
 * A cleared field is written as an empty string, which reads back as null.
 * Keywords are joined on a space by pdf-lib; staging refuses any containing
 * whitespace, so the round trip is exact (D0).
 *
 * `updateMetadata: false` leaves the Producer and Creator the file already
 * names; only the modification date is set, because the file did change.
 * Encrypted files are refused: pdf-lib loads them when told to ignore the
 * encryption, but saves a file no reader can open.
 */
export async function writeEmbeddedMetadata(
  bytes: ArrayBuffer | Uint8Array,
  values: MetadataValues,
  now: Date = new Date(),
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(bytes, {
    ignoreEncryption: true,
    updateMetadata: false,
  });
  if (pdf.isEncrypted) {
    throw new PdfNotWritable(
      "This PDF is encrypted, so its details can't be rewritten without damaging it",
    );
  }
  pdf.setTitle(values.title ?? "");
  pdf.setSubject(values.subject ?? "");
  pdf.setAuthor(values.author ?? "");
  pdf.setKeywords(values.keywords);
  pdf.setModificationDate(now);
  return pdf.save();
}
