import type { PdfDocument } from "@/lib/pdf-documents";
import type { ListRow } from "@/lib/pdf-list-view";
import { listedValues } from "@/lib/pdf-shown-values";
import { summarizePending } from "@/lib/pdf-staging";

/**
 * A document as the list shows it. Server side: the browser gets these rows,
 * not whole documents with their Drive ids and snapshots.
 */
export function toListRow(d: PdfDocument): ListRow {
  // What the file says fills a never-edited row (task 7d.3).
  const { title, subject, author, keywords, pageCount } = listedValues(d);
  let state: ListRow["state"] = "untagged";
  let stateLabel = "Not yet tagged";
  if (d.hasPendingEdits) {
    const count = summarizePending(d).count;
    state = "pending";
    stateLabel = count > 0 ? `${count} pending ${count === 1 ? "edit" : "edits"}` : "Pending edits";
  } else if (d.committedAt) {
    state = "committed";
    stateLabel = "Committed";
  }
  return { id: d.id, filename: d.filename, title, subject, author, keywords, pageCount, state, stateLabel };
}
