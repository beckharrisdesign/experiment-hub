/**
 * The scheduled folder sync (task 7d): find new PDFs in the chosen folder, and
 * read what each unread file says, so the list fills in without anyone opening
 * the files one by one. openspec/changes/pdf-metadata-viewer-cloud — D12.
 *
 * Two steps, the same two a person would take by hand:
 *
 *   1. List the folder and import it: `pdf_import_folder`, the function the
 *      folder picker runs. New files get a reference row; existing ones keep
 *      their staged edits and baseline (migration 026).
 *   2. For each file whose values aren't stored for the revision Drive just
 *      listed, download it, read it (`readFile`, the detail page's read), and
 *      save the read (migration 031). Nothing is kept but the values.
 *
 *   3. Draw ahead: keep images of the pages of each document whose pages aren't
 *      kept yet, and clear out the ones whose file or version is gone (task 7f,
 *      lib/pdf-page-store.ts). It uses what time step 2 leaves.
 *
 *   4. Keep the text of drawn pages (task 7h, lib/pdf-page-text.ts), in what time
 *      is left after that.
 *
 * Steps 2 to 4 stop at a time budget, so a big backlog drains over several
 * runs instead of timing out in one. Never-read files go first.
 */
import { listPdfDocuments, getPdfAdminClient, type PdfDocument } from "@/lib/pdf-documents";
import {
  downloadDriveFile,
  getDriveConnection,
  getDriveHeadRevisionId,
  getValidAccessToken,
  listPdfsInFolder,
  type DriveFile,
} from "@/lib/pdf-drive";
import { readFile, storedFileValues } from "@/lib/pdf-file-read";
import { syncPages, type PageSyncResult, type WantedDocument } from "@/lib/pdf-page-store";
import { syncText, type TextSyncResult } from "@/lib/pdf-page-text";
import { listedValues } from "@/lib/pdf-shown-values";

export interface SyncResult {
  /** Why nothing ran, when nothing did. */
  skipped?: "no-folder";
  /** Files in the folder now. */
  inFolder: number;
  /** New files found this run. */
  added: number;
  /** Files read and saved this run. */
  read: number;
  /** Files Drive or pdf-lib couldn't read this run; tried again next run. */
  failed: number;
  /** Files still waiting for a read when the time ran out. */
  remaining: number;
  /** Drawing ahead; absent when it couldn't run, which never fails the sync. */
  pages?: PageSyncResult;
  /** Keeping text; absent when it couldn't run, which never fails the sync. */
  text?: TextSyncResult;
}

export interface SyncOptions {
  /** Stop starting reads after this long; the run's own limit is 60 s. */
  budgetMs?: number;
  /** Files downloaded at once. Each is held in memory while it's read. */
  concurrency?: number;
  now?: () => number;
}

/** Needs a read: nothing stored for the revision Drive lists now. */
export function needsRead(document: PdfDocument, head: string | null): boolean {
  return head !== null && storedFileValues(document, head) === null;
}

export async function syncFolder({
  budgetMs = 40_000,
  concurrency = 3,
  now = () => performance.now(),
}: SyncOptions = {}): Promise<SyncResult> {
  const started = now();
  const startedAt = new Date();
  const { folder } = await getDriveConnection();
  if (!folder) {
    return { skipped: "no-folder", inFolder: 0, added: 0, read: 0, failed: 0, remaining: 0 };
  }

  const accessToken = await getValidAccessToken();
  const files = await listPdfsInFolder(accessToken, folder.id);

  const { data, error } = await getPdfAdminClient().rpc("pdf_import_folder", {
    folder_id: folder.id,
    folder_name: folder.name,
    files,
  });
  if (error) throw new Error(`Could not store document references: ${error.message}`);
  const added = ((data ?? {}) as { inserted?: number }).inserted ?? 0;

  // After the import, so new rows are in it and revisions are current.
  const documents = new Map(
    (await listPdfDocuments(folder.id)).map((d) => [d.driveFileId, d] as const),
  );
  const queue: { document: PdfDocument; file: DriveFile }[] = [];
  for (const file of files) {
    const document = documents.get(file.id);
    if (document && needsRead(document, file.headRevisionId)) queue.push({ document, file });
  }
  // Never read at all first; a changed file already shows something.
  queue.sort((a, b) => Number(a.document.fileRead !== null) - Number(b.document.fileRead !== null));

  let read = 0;
  let failed = 0;
  let next = 0;
  const worker = async () => {
    while (next < queue.length && now() - started < budgetMs) {
      const { document, file } = queue[next++];
      // The listing just gave the head revision, so no per-file check.
      const state = await readFile(document, { ok: true, accessToken, head: file.headRevisionId });
      if (state.ok) read += 1;
      else failed += 1;
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));

  const wanted: WantedDocument[] = [];
  for (const file of files) {
    const document = documents.get(file.id);
    if (document && file.headRevisionId) {
      wanted.push({
        id: document.id,
        driveFileId: file.id,
        revision: file.headRevisionId,
        pageCount: listedValues(document).pageCount,
      });
    }
  }
  const work = {
    wanted,
    download: (id: string) => downloadDriveFile(accessToken, id),
    headRevision: (id: string) => getDriveHeadRevisionId(accessToken, id),
    outOfTime: () => now() - started >= budgetMs,
  };
  let pages: PageSyncResult | undefined;
  try {
    pages = await syncPages({ ...work, startedAt });
  } catch (error) {
    console.error("pdf sync: could not draw pages ahead:", error);
  }
  let text: TextSyncResult | undefined;
  try {
    text = await syncText(work);
  } catch (error) {
    console.error("pdf sync: could not keep pages' text:", error);
  }

  return {
    inFolder: files.length,
    added,
    read,
    failed,
    remaining: queue.length - read - failed,
    ...(pages ? { pages } : {}),
    ...(text ? { text } : {}),
  };
}
