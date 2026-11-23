/**
 * Split one PDF into several, each a new file in Drive.
 * openspec/changes/pdf-metadata-viewer-cloud — tasks 7b.2, 7b.3; design.md D10,
 * D11; Figma 02.11 (frame 69:9).
 *
 * Ported from v1's `/api/split`, with what the design changed:
 *
 * - Parts are new Drive files beside the original, named as v1 named them
 *   (`name-001.pdf`, `-002`, …), and become document rows linked back by
 *   split_from_document_id and ordered by split_index.
 * - The original is not tagged `already-split` / `needs-deleting`, which
 *   rewrote its bytes and broke its baseline. It is marked superseded in the
 *   database and its file is left exactly as it was.
 * - Each part carries the original's title, subject, author and keywords as
 *   shown here (staged values included), so nothing typed is lost (7b.3).
 *
 * All parts are uploaded before anything is recorded. If any upload fails, the
 * ones already made are moved to the trash, so a failure never leaves half a
 * split in Drive.
 */
import { PDFDocument } from "pdf-lib";
import { getPdfAdminClient, getPdfDocument } from "@/lib/pdf-documents";
import {
  createDriveFile,
  downloadDriveFile,
  getDriveHeadRevisionId,
  getDriveParent,
  getValidAccessToken,
  trashDriveFile,
} from "@/lib/pdf-drive";
import { InvalidSplit, partName, planParts } from "@/lib/pdf-split-plan";
import {
  PdfNotWritable,
  readEmbeddedMetadata,
  writeEmbeddedMetadata,
  type EmbeddedMetadata,
  type MetadataValues,
} from "@/lib/pdf-embedded";

/** This document was already split; its parts are the documents now. */
export class AlreadySplit extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AlreadySplit";
  }
}

/** The file changed in Drive since editing started, or while it was read. */
export class SplitConflict extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SplitConflict";
  }
}

/** The parts are in Drive but the database couldn't record them. */
export class SplitNotRecorded extends Error {
  constructor(message: string, public readonly driveFileIds: string[]) {
    super(message);
    this.name = "SplitNotRecorded";
  }
}

/** One part's bytes: its pages copied out, then the shared values written in. */
async function buildPart(
  source: PDFDocument,
  [first, last]: [number, number],
  values: MetadataValues,
): Promise<{ bytes: Uint8Array; embedded: EmbeddedMetadata }> {
  const part = await PDFDocument.create();
  const pages = await part.copyPages(
    source,
    Array.from({ length: last - first + 1 }, (_, i) => first - 1 + i),
  );
  for (const page of pages) part.addPage(page);
  const creator = source.getCreator();
  const producer = source.getProducer();
  if (creator) part.setCreator(creator);
  if (producer) part.setProducer(producer);
  const bytes = await writeEmbeddedMetadata(await part.save(), values);
  // Recorded from the bytes, not the values intended, as commit does.
  return { bytes, embedded: await readEmbeddedMetadata(bytes) };
}

export { InvalidSplit, partName, planParts };

export interface SplitResult {
  outputs: string[];
}

/**
 * Split a document after the given pages. Null when there is no such document.
 */
export async function splitPdfDocument(id: string, breaks: number[]): Promise<SplitResult | null> {
  const document = await getPdfDocument(id);
  if (!document) return null;
  if (document.supersededAt) throw new AlreadySplit("This document was already split");

  const accessToken = await getValidAccessToken();
  // Also how a trashed file is caught (it reads as missing).
  const before = await getDriveHeadRevisionId(accessToken, document.driveFileId);
  if (document.fileBaseline && before !== document.driveRevisionId) {
    throw new SplitConflict("The file changed in Drive after you started editing");
  }
  const original = await downloadDriveFile(accessToken, document.driveFileId);
  const after = await getDriveHeadRevisionId(accessToken, document.driveFileId);
  if (after !== before) throw new SplitConflict("The file changed in Drive while it was being read");

  const source = await PDFDocument.load(original, { ignoreEncryption: true, updateMetadata: false });
  if (source.isEncrypted) throw new PdfNotWritable("This PDF is encrypted, so it can't be split here");
  const parts = planParts(source.getPageCount(), breaks);

  const values: MetadataValues = {
    title: document.title,
    subject: document.subject,
    author: document.author,
    keywords: document.keywords,
  };
  const parentId = document.driveFolderId ?? (await getDriveParent(accessToken, document.driveFileId));

  const created: Array<{ driveFileId: string; filename: string; revision: string | null; index: number; embedded: EmbeddedMetadata }> = [];
  try {
    for (const [i, range] of parts.entries()) {
      const { bytes, embedded } = await buildPart(source, range, values);
      const filename = partName(document.filename, i + 1);
      const file = await createDriveFile(accessToken, { name: filename, parentId, bytes });
      created.push({ driveFileId: file.id, filename, revision: file.revision, index: i + 1, embedded });
    }
  } catch (error) {
    // Take back what was made, so a failed split leaves nothing behind.
    for (const part of created) {
      await trashDriveFile(accessToken, part.driveFileId).catch((e) =>
        console.error(`pdf split: could not trash part ${part.driveFileId} of ${id}:`, e),
      );
    }
    throw error;
  }

  const { data, error } = await getPdfAdminClient().rpc("pdf_record_split", {
    doc: id,
    expected_revision: document.driveRevisionId,
    outputs: created,
  });
  if (error) {
    const ids = created.map((p) => p.driveFileId);
    console.error(`pdf split: ${id} split into Drive files ${ids.join(", ")}, but not recorded:`, error);
    if (error.code === "55000") throw new AlreadySplit("This document was already split");
    throw new SplitNotRecorded(`The parts are in Drive but weren't recorded: ${error.message}`, ids);
  }
  return { outputs: ((data as { outputs?: string[] } | null)?.outputs ?? []).map(String) };
}

/** "It's one document": not offered for splitting again (D11's split_not_needed). */
export async function markSplitNotNeeded(id: string): Promise<boolean> {
  const { data, error } = await getPdfAdminClient()
    .from("pdf_documents")
    .update({ split_not_needed: true, updated_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select("id");
  if (error) throw new Error(`Failed to mark document: ${error.message}`);
  return (data ?? []).length > 0;
}
