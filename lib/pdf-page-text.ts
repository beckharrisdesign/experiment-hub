/**
 * The text of each page, kept beside its image (task 7h).
 * openspec/changes/pdf-metadata-viewer-cloud — design.md D15, migration 033.
 *
 * What a page says itself is read from the PDF; a page with no text of its own
 * is read from its kept image by tesseract (lib/pdf-ocr.ts), here and nowhere
 * else. Kept by page set, so a commit carries it and the clear-out removes it
 * with the images. Like them it can always be made again.
 */
import { getPdfAdminClient } from "@/lib/pdf-documents";
import { openReader, type PageReader } from "@/lib/pdf-ocr";
import { PAGE_BUCKET, STORED_WIDTH, type WantedDocument } from "@/lib/pdf-page-store";
import { openPdf, shrinkJpeg, type OpenPdf } from "@/lib/pdf-render";

/** Fewer letters than this is a stamp or a page number, not a page's text. */
export const ENOUGH_LETTERS = 20;

export interface TextSyncOptions {
  wanted: WantedDocument[];
  download: (driveFileId: string) => Promise<ArrayBuffer>;
  headRevision: (driveFileId: string) => Promise<string | null>;
  outOfTime: () => boolean;
}

export interface TextSyncResult {
  /** Pages read and kept this run, and how many of those by tesseract. */
  textPages: number;
  scansRead: number;
  /** Documents whose text isn't all kept yet. */
  textWaiting: number;
}

/**
 * Text as it can be stored and sent: no control characters (Postgres refuses a
 * NUL outright), no trailing spaces, no runs of blank lines.
 */
export function tidyText(text: string): string {
  return text
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f￾￿]/g, "")
    // An unpaired surrogate can't be written as UTF-8.
    .replace(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function hasEnoughText(text: string): boolean {
  return (text.match(/[\p{L}\p{N}]/gu) ?? []).length >= ENOUGH_LETTERS;
}

const sets = () => getPdfAdminClient().from("pdf_page_sets");
const texts = () => getPdfAdminClient().from("pdf_page_text");

interface SetToRead {
  documentId: string;
  revision: string;
  setId: string;
  pageCount: number;
}

async function setsToRead(wanted: WantedDocument[]): Promise<SetToRead[]> {
  const { data, error } = await sets()
    .select("document_id, drive_revision, set_id, page_count")
    .not("drawn_at", "is", null)
    .not("page_count", "is", null)
    .is("text_at", null);
  if (error) throw new Error(`Could not read page sets: ${error.message}`);
  const revisions = new Map(wanted.map((d) => [d.id, d.revision] as const));
  return ((data ?? []) as Record<string, unknown>[])
    .map((row) => ({
      documentId: String(row.document_id),
      revision: String(row.drive_revision),
      setId: String(row.set_id),
      pageCount: Number(row.page_count),
    }))
    .filter((s) => revisions.get(s.documentId) === s.revision)
    .sort((a, b) => a.pageCount - b.pageCount);
}

async function pagesRead(setId: string): Promise<Set<number>> {
  const { data, error } = await texts().select("page").eq("set_id", setId);
  if (error) throw new Error(`Could not read kept text: ${error.message}`);
  return new Set(((data ?? []) as { page: number }[]).map((r) => r.page));
}

/** The kept image, or the page drawn again should it be missing. */
async function pageImage(setId: string, page: number, pdf: OpenPdf): Promise<Uint8Array> {
  const { data } = await getPdfAdminClient()
    .storage.from(PAGE_BUCKET)
    .download(`${setId}/${page}.jpg`);
  if (data) return new Uint8Array(await data.arrayBuffer());
  return (await pdf.draw(page, STORED_WIDTH)).jpeg;
}

/**
 * Read what's missing until time runs out, shortest documents first. One page
 * at a time; tesseract is started only if a page needs it.
 */
export async function syncText(options: TextSyncOptions): Promise<TextSyncResult> {
  const queue = await setsToRead(options.wanted);
  const files = new Map(options.wanted.map((d) => [d.id, d.driveFileId] as const));
  const result: TextSyncResult = { textPages: 0, scansRead: 0, textWaiting: queue.length };
  let reader: PageReader | null = null;

  const readDocument = async (set: SetToRead): Promise<boolean> => {
    const driveFileId = files.get(set.documentId)!;
    const bytes = await options.download(driveFileId);
    // Listed before the download and unchanged after it: these are its bytes.
    if ((await options.headRevision(driveFileId)) !== set.revision) return false;
    const pdf = await openPdf(bytes);
    try {
      const done = await pagesRead(set.setId);
      for (let page = 1; page <= set.pageCount; page++) {
        if (done.has(page)) continue;
        if (options.outOfTime()) return false;
        let text = tidyText(await pdf.text(page).catch(() => ""));
        let source: "file" | "ocr" = "file";
        let confidence: number | null = null;
        if (!hasEnoughText(text)) {
          source = "ocr";
          const image = await pageImage(set.setId, page, pdf);
          reader ??= await openReader();
          try {
            const read = reader.read(image);
            text = tidyText(read.text);
            confidence = Math.max(0, Math.min(100, Math.round(read.confidence)));
          } catch (error) {
            // Kept as nothing read, so one bad page isn't tried every run.
            console.warn(`pdf text: page ${page} of ${set.documentId} couldn't be read:`, error);
            text = "";
            confidence = 0;
          }
          result.scansRead += 1;
        }
        const { error } = await texts().upsert(
          { set_id: set.setId, page, text, source, confidence },
          { onConflict: "set_id,page" },
        );
        if (error) throw new Error(`Could not keep page ${page}'s text: ${error.message}`);
        result.textPages += 1;
      }
    } finally {
      await pdf.close();
    }
    const { error } = await sets()
      .update({ text_at: new Date().toISOString() })
      .eq("set_id", set.setId);
    if (error) throw new Error(`Could not finish a document's text: ${error.message}`);
    return true;
  };

  try {
    for (const set of queue) {
      if (options.outOfTime()) break;
      try {
        if (await readDocument(set)) result.textWaiting -= 1;
      } catch (error) {
        console.warn(`pdf text: could not read ${set.documentId}:`, error);
      }
    }
  } finally {
    (reader as PageReader | null)?.close();
  }
  return result;
}

// ---------------------------------------------------------------------------
// For suggestions
// ---------------------------------------------------------------------------

/**
 * Below this, tesseract's reading isn't used. On the first 61 real scans nothing
 * fell between 36 and 56: art below, documents above (design.md D15).
 */
export const SURE_ENOUGH = 50;

/** As much as is sent: far more than says what a document is. */
export const MAX_TEXT = 20_000;

/** Wide enough to make out a letterhead, a layout or a drawing. */
const LOOK_WIDTH = 768;

export interface DocumentText {
  /** The pages that could be read, in order, each under its number. */
  text: string;
  /** Page 1, small, for what words can't say. */
  look: Uint8Array;
}

export interface KeptPageText {
  page: number;
  text: string;
  source: "file" | "ocr";
  confidence: number | null;
}

/**
 * What to send, or null when there is too little to go on: most pages must be
 * readable, so a drawing with a caption still goes as a picture.
 */
export function textToSend(pages: KeptPageText[]): string | null {
  const readable = pages.filter(
    (p) => hasEnoughText(p.text) && (p.source === "file" || (p.confidence ?? 0) >= SURE_ENOUGH),
  );
  if (readable.length === 0 || readable.length * 2 < pages.length) return null;
  const all = [...readable]
    .sort((a, b) => a.page - b.page)
    .map((p) => `--- Page ${p.page} ---\n${p.text}`)
    .join("\n\n");
  return all.length > MAX_TEXT ? `${all.slice(0, MAX_TEXT)}\n[…]` : all;
}

/** A document's kept text and a look at its first page, or null: send the PDF. */
export async function getDocumentText(
  documentId: string,
  revision: string | null,
): Promise<DocumentText | null> {
  if (!revision) return null;
  const { data: set, error } = await sets()
    .select("set_id, page_count")
    .eq("document_id", documentId)
    .eq("drive_revision", revision)
    .not("text_at", "is", null)
    .maybeSingle();
  if (error) throw new Error(`Could not read page sets: ${error.message}`);
  if (!set) return null;
  const setId = String((set as Record<string, unknown>).set_id);
  const { data, error: textError } = await texts()
    .select("page, text, source, confidence")
    .eq("set_id", setId);
  if (textError) throw new Error(`Could not read kept text: ${textError.message}`);
  const text = textToSend((data ?? []) as KeptPageText[]);
  if (!text) return null;
  const { data: image } = await getPdfAdminClient()
    .storage.from(PAGE_BUCKET)
    .download(`${setId}/1.jpg`);
  if (!image) return null;
  return { text, look: await shrinkJpeg(new Uint8Array(await image.arrayBuffer()), LOOK_WIDTH) };
}
