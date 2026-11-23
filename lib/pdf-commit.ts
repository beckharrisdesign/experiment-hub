/**
 * Commit a document's staged edits into its PDF in Drive, and discard them.
 * openspec/changes/pdf-metadata-viewer-cloud — tasks 8.2, 8.3, 8.6; design.md D4.
 *
 * Commit is one read-modify-write against the same Drive file:
 *
 *   1. Check Drive's head revision against the one the baseline was read from.
 *      If it moved, the file changed in Drive since editing started: stop, and
 *      write nothing (task 8.3). Comparing the two versions is task 8.4.
 *   2. Download, write the four fields with pdf-lib, upload over the same id.
 *   3. Record it: history rows, new baseline, new revision (migration 025).
 *
 * Every failure before step 3 leaves the database untouched, so staged edits
 * survive and the commit can be retried (task 8.6).
 */
import {
  getPdfAdminClient,
  getPdfDocument,
  type PdfDocument,
} from "@/lib/pdf-documents";
import {
  downloadDriveFile,
  getDriveHeadRevisionId,
  getValidAccessToken,
  uploadDriveFile,
} from "@/lib/pdf-drive";
import { readEmbeddedMetadata, writeEmbeddedMetadata } from "@/lib/pdf-embedded";
import { stagePdfEdits } from "@/lib/pdf-staging";
import { clearAttention, recordAttention } from "@/lib/pdf-attention";
import { DocumentReplaced } from "@/lib/pdf-split-plan";

/** The file in Drive is no longer the version editing started from. */
export class CommitConflict extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommitConflict";
  }
}

/**
 * The file was written to Drive but the record could not be updated. Rare, and
 * the one failure that is not clean: Drive has the new file while the database
 * still describes the old revision, so the next commit will report a conflict.
 */
export class CommitNotRecorded extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommitNotRecorded";
  }
}

export type CommitResult =
  | { status: "committed"; document: PdfDocument; changed: number }
  | { status: "nothing-pending"; document: PdfDocument };

/**
 * Commit staged edits. Null when there is no such document.
 *
 * A failure is recorded as the document's Needs attention instance before it
 * propagates (task 8.8), and a success clears whatever was there, so a retry
 * that works leaves nothing behind.
 */
export async function commitPdfDocument(id: string): Promise<CommitResult | null> {
  try {
    const result = await commitOnce(id);
    if (result?.status === "committed") await clearAttention(id);
    return result;
  } catch (error) {
    if (!(error instanceof DocumentReplaced)) await recordAttention(id, error);
    throw error;
  }
}

async function commitOnce(id: string): Promise<CommitResult | null> {
  const document = await getPdfDocument(id);
  if (!document) return null;
  if (document.supersededAt) throw new DocumentReplaced();
  // Spec: committing with nothing pending makes no write to storage.
  if (!document.hasPendingEdits) return { status: "nothing-pending", document };

  const expected = document.driveRevisionId;
  const accessToken = await getValidAccessToken();

  const before = await getDriveHeadRevisionId(accessToken, document.driveFileId);
  if (before !== expected) {
    throw new CommitConflict("The file changed in Drive after editing started");
  }
  const original = await downloadDriveFile(accessToken, document.driveFileId);
  // The bytes are only safe to modify if they are still the expected version.
  const after = await getDriveHeadRevisionId(accessToken, document.driveFileId);
  if (after !== expected) {
    throw new CommitConflict("The file changed in Drive while it was being read");
  }

  const written = await writeEmbeddedMetadata(original, {
    title: document.title,
    subject: document.subject,
    author: document.author,
    keywords: document.keywords,
  });
  const newRevision = await uploadDriveFile(accessToken, document.driveFileId, written);
  // Recorded from the bytes uploaded, not the values intended, so the baseline
  // is what the file says rather than what it was meant to say.
  const embedded = await readEmbeddedMetadata(written);

  const { data, error } = await getPdfAdminClient().rpc("pdf_record_commit", {
    doc: id,
    expected_revision: expected,
    new_revision: newRevision,
    embedded,
  });
  if (error) {
    console.error(
      `pdf commit: ${id} written to Drive as revision ${newRevision}, but not recorded:`,
      error,
    );
    throw new CommitNotRecorded(`Written to Drive but not recorded: ${error.message}`);
  }

  const updated = await getPdfDocument(id);
  if (!updated) throw new CommitNotRecorded("Document disappeared after commit");
  return {
    status: "committed",
    document: updated,
    changed: Number((data as { changed?: number } | null)?.changed ?? 0),
  };
}

/**
 * Put every staged field back to what the file says. Writes nothing to Drive;
 * the reversal is staged like any other edit, so history keeps both.
 * Null when there is no such document.
 */
export async function discardPdfEdits(id: string): Promise<PdfDocument | null> {
  const document = await getPdfDocument(id);
  if (!document) return null;
  const baseline = document.fileBaseline;
  if (!document.hasPendingEdits || !baseline) return document;

  // Nothing is left to write, so whatever went wrong writing it is moot.
  await clearAttention(id);
  return stagePdfEdits(id, {
    title: baseline.title,
    subject: baseline.subject,
    author: baseline.author,
    keywords: baseline.keywords,
  });
}
