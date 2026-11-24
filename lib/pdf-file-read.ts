/**
 * The detail page's two reads of a document's file in Drive, kept apart so the
 * page can show itself before either finishes.
 * openspec/changes/pdf-metadata-viewer-cloud — design.md D8.
 */
import type { PdfDocument } from "@/lib/pdf-documents";
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
 * What the file says. A baseline describes the file at `driveRevisionId`
 * (first edit, commit and rebaseline all move the two together), so while
 * Drive still holds that revision the stored copy is the file's own values
 * and the download is skipped.
 */
export async function readFile(document: PdfDocument, access: Access): Promise<FileState> {
  if (!access.ok) return access;
  if (document.fileBaseline && access.head === document.driveRevisionId) {
    return { ok: true, embedded: document.fileBaseline };
  }
  try {
    const bytes = await downloadDriveFile(access.accessToken, document.driveFileId);
    return { ok: true, embedded: await readEmbeddedMetadata(bytes) };
  } catch (error) {
    return problem(error, "read file from Drive");
  }
}
