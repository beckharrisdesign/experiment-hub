/**
 * Which values the details panel shows (design.md D8, "captured on first
 * edit"). Pure, so the page and the browser-side loader agree.
 *
 * Until a document's first edit its stored fields are unread nulls, and what
 * the file says stands in. From the first edit on, the stored fields are
 * authoritative.
 */
export interface ShownValues {
  title: string | null;
  subject: string | null;
  author: string | null;
  keywords: string[];
}

export interface InFileValues extends ShownValues {
  pageCount: number;
}

export function shownValues(
  stored: ShownValues,
  baselined: boolean,
  inFile: InFileValues | undefined,
): ShownValues {
  if (baselined) return stored;
  return {
    title: stored.title ?? inFile?.title ?? null,
    subject: stored.subject ?? inFile?.subject ?? null,
    author: stored.author ?? inFile?.author ?? null,
    keywords: stored.keywords.length > 0 ? stored.keywords : (inFile?.keywords ?? []),
  };
}

/** What the file read returns, to the page or over the wire. */
export type FileValuesState =
  | { ok: true; embedded: InFileValues }
  | { ok: false; reason: "reauthorize" | "missing" | "unreadable" };

/** The fields a document's row in the list carries. */
export interface ListedDocument extends ShownValues {
  pageCount: number | null;
  fileBaseline: InFileValues | null;
  driveRevisionId: string | null;
  fileRead: { revision: string; embedded: InFileValues } | null;
}

/**
 * What the list shows for a document (task 7d.3): the same values the detail
 * page shows, without fetching anything. A saved read counts only while it is
 * from the revision Drive last listed; the scheduled sync (lib/pdf-sync.ts)
 * refreshes both, so a file that changed shows blanks only until the next run.
 */
export function listedValues(d: ListedDocument): ShownValues & { pageCount: number | null } {
  const baselined = d.fileBaseline !== null;
  const read = d.fileRead && d.fileRead.revision === d.driveRevisionId ? d.fileRead.embedded : undefined;
  const fileFacts = baselined ? d.fileBaseline! : read;
  const { title, subject, author, keywords } = shownValues(d, baselined, read);
  return {
    title,
    subject,
    author,
    keywords,
    pageCount: d.pageCount ?? (fileFacts && fileFacts.pageCount > 0 ? fileFacts.pageCount : null),
  };
}
