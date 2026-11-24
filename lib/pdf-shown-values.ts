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
