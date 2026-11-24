/**
 * The detail page's two reads of a document's file in Drive, kept apart so the
 * page can show itself before either finishes.
 * openspec/changes/pdf-metadata-viewer-cloud — design.md D8.
 */
import { getPdfAdminClient, type PdfDocument } from "@/lib/pdf-documents";
import {
  DriveFileMissing,
  DriveReauthorizationRequired,
  downloadDriveFile,
  getDriveHeadRevisionId,
  getValidAccessToken,
} from "@/lib/pdf-drive";
import { readEmbeddedMetadata, type EmbeddedMetadata } from "@/lib/pdf-embedded";

export type Problem = "reauthorize" | "missing" | "unreadable";

export type Access =
  | { ok: true; accessToken: string; head: string | null }
  | { ok: false; reason: Problem };

export type FileState =
  | { ok: true; embedded: EmbeddedMetadata }
  | { ok: false; reason: Problem };

function problem(error: unknown, what: string): { ok: false; reason: Problem } {
  if (error instanceof DriveReauthorizationRequired) return { ok: false, reason: "reauthorize" };
  if (error instanceof DriveFileMissing) return { ok: false, reason: "missing" };
  console.error(`pdf detail: could not ${what}:`, error);
  return { ok: false, reason: "unreadable" };
}

/**
 * Is the file still in Drive, and at which revision? One small metadata read.
 * A trashed file still downloads; only this read reports it gone.
 *
 * A failure here never takes the page down: the working store's view of the
 * document still stands, and a broken reference should read as one (task 5.6).
 */
export async function checkFile(document: PdfDocument): Promise<Access> {
  try {
    const accessToken = await getValidAccessToken();
    const head = await getDriveHeadRevisionId(accessToken, document.driveFileId);
    return { ok: true, accessToken, head };
  } catch (error) {
    return problem(error, "reach the file in Drive");
  }
}

/**
 * What the file says at Drive's head revision, if it is already stored: the
 * baseline (first edit, commit and rebaseline move it and driveRevisionId
 * together), or the last saved read (migration 031). Null means download.
 */
export function storedFileValues(
  document: PdfDocument,
  head: string | null,
): EmbeddedMetadata | null {
  if (head === null) return null;
  if (document.fileBaseline && head === document.driveRevisionId) return document.fileBaseline;
  if (document.fileRead && head === document.fileRead.revision) return document.fileRead.embedded;
  return null;
}

/**
 * Save a read so the next visit needs no download. Best effort: a failure
 * costs only that, so it is logged and the values are still returned.
 */
async function recordFileRead(id: string, revision: string, embedded: EmbeddedMetadata) {
  try {
    const { error } = await getPdfAdminClient().rpc("pdf_record_file_read", {
      doc: id,
      revision,
      embedded,
    });
    if (error) console.warn(`pdf file read: could not save the read of ${id}:`, error.message);
  } catch (error) {
    console.warn(`pdf file read: could not save the read of ${id}:`, error);
  }
}

/**
 * What the file says: stored if Drive still holds the revision it came from,
 * otherwise downloaded, read, and saved against that revision.
 */
export async function readFile(document: PdfDocument, access: Access): Promise<FileState> {
  if (!access.ok) return access;
  const stored = storedFileValues(document, access.head);
  if (stored) return { ok: true, embedded: stored };
  let embedded: EmbeddedMetadata;
  try {
    const bytes = await downloadDriveFile(access.accessToken, document.driveFileId);
    embedded = await readEmbeddedMetadata(bytes);
  } catch (error) {
    return problem(error, "read file from Drive");
  }
  // Saved against the revision checked before the download. Had the file
  // changed in between, Drive's head has moved on, so this entry never matches.
  if (access.head) await recordFileRead(document.id, access.head, embedded);
  return { ok: true, embedded };
}
