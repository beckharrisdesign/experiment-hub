/**
 * Needs attention — record and clear a document's open exception.
 * openspec/changes/pdf-metadata-viewer-cloud — task 8.8; design.md D4.
 *
 * An instance carries its kind, a cause in the user's terms, and when it
 * happened; the action follows from the kind. Recording never throws: it runs
 * while a commit is already failing, and losing the note must not replace the
 * real error the user is about to see.
 */
import { getPdfAdminClient } from "@/lib/pdf-documents";
import { DriveFileMissing, DriveReauthorizationRequired, DriveWriteRefused } from "@/lib/pdf-drive";
import { PdfNotWritable } from "@/lib/pdf-embedded";

export type AttentionKind = "conflict" | "commit_failed" | "file_missing";

export interface Attention {
  kind: AttentionKind;
  message: string;
  at: string;
}

/**
 * What a commit failure means for the list, or null when it is not about this
 * document. A lapsed Drive grant affects every document at once and is shown
 * as a sign-in prompt, not as one instance per row.
 */
export function attentionFor(error: unknown): { kind: AttentionKind; message: string } | null {
  if (error instanceof DriveReauthorizationRequired) return null;
  if (error instanceof Error && error.name === "CommitConflict") {
    return {
      kind: "conflict",
      message: "Changed in Drive after you started editing. Your edits are safe and still uncommitted.",
    };
  }
  if (error instanceof Error && error.name === "ComparisonStale") return null;
  if (error instanceof DriveFileMissing) {
    return { kind: "file_missing", message: "No longer in Drive. Its details and history are kept." };
  }
  if (error instanceof DriveWriteRefused) {
    return {
      kind: "commit_failed",
      message: "Drive refused the write. The file may be shared with you read-only. Nothing was lost.",
    };
  }
  if (error instanceof PdfNotWritable) {
    return { kind: "commit_failed", message: `${error.message}. Nothing was lost.` };
  }
  if (error instanceof Error && error.name === "CommitNotRecorded") {
    return {
      kind: "commit_failed",
      message: "Written to Drive, but the record couldn't be updated. Open it to check before editing again.",
    };
  }
  return { kind: "commit_failed", message: "The write to Drive failed. Nothing was lost." };
}

export async function recordAttention(id: string, error: unknown): Promise<void> {
  const attention = attentionFor(error);
  if (!attention) return;
  try {
    const { error: dbError } = await getPdfAdminClient()
      .from("pdf_documents")
      .update({
        attention_kind: attention.kind,
        attention_message: attention.message,
        attention_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (dbError) console.error(`pdf attention: could not record for ${id}:`, dbError);
  } catch (e) {
    console.error(`pdf attention: could not record for ${id}:`, e);
  }
}

export async function clearAttention(id: string): Promise<void> {
  try {
    const { error } = await getPdfAdminClient()
      .from("pdf_documents")
      .update({ attention_kind: null, attention_message: null, attention_at: null })
      .eq("id", id)
      .not("attention_kind", "is", null);
    if (error) console.error(`pdf attention: could not clear for ${id}:`, error);
  } catch (e) {
    console.error(`pdf attention: could not clear for ${id}:`, e);
  }
}
