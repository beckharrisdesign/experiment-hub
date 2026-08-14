/**
 * Read access for the hosted pdf-metadata-viewer.
 * openspec/changes/pdf-metadata-viewer-cloud — design.md D1, D2.
 *
 * Every function here serves from Postgres and touches Drive for nothing. That
 * is the point of the working store: v1 read and parsed every PDF just to fill
 * the file list's columns, which is untenable once the bytes are behind a
 * network. Bytes are fetched only to render a preview, by a separate route.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client, following the per-feature pattern already used by
 * `lib/etsy-listing-kit/supabase-admin.ts` rather than widening
 * `lib/supabase.ts`, whose own `getAdminClient` is deliberately module-private.
 *
 * Throws rather than returning null when unconfigured: these three tables carry
 * RLS with no policies, so a missing service-role key would otherwise surface
 * as an empty archive — alarming, and wrong.
 */
export function getPdfAdminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface PdfDocument {
  id: string;
  driveFileId: string;
  filename: string | null;
  title: string | null;
  subject: string | null;
  author: string | null;
  keywords: string[];
  pageCount: number | null;
  hasPendingEdits: boolean;
  committedAt: string | null;
  markedForDeletion: boolean;
  splitNotNeeded: boolean;
  splitFromDocumentId: string | null;
  splitIndex: number | null;
  supersededAt: string | null;
}

export interface PdfHistoryEntry {
  id: number;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  changeType: string;
  changedAt: string;
}

type Row = Record<string, unknown>;

const COLUMNS =
  "id, drive_file_id, filename, title, subject, author, keywords, page_count, " +
  "has_pending_edits, committed_at, marked_for_deletion, split_not_needed, " +
  "split_from_document_id, split_index, superseded_at";

function toDocument(row: Row): PdfDocument {
  return {
    id: String(row.id),
    driveFileId: String(row.drive_file_id),
    filename: (row.filename as string) ?? null,
    title: (row.title as string) ?? null,
    subject: (row.subject as string) ?? null,
    author: (row.author as string) ?? null,
    keywords: (row.keywords as string[]) ?? [],
    pageCount: (row.page_count as number) ?? null,
    hasPendingEdits: Boolean(row.has_pending_edits),
    committedAt: (row.committed_at as string) ?? null,
    markedForDeletion: Boolean(row.marked_for_deletion),
    splitNotNeeded: Boolean(row.split_not_needed),
    splitFromDocumentId: (row.split_from_document_id as string) ?? null,
    splitIndex: (row.split_index as number) ?? null,
    supersededAt: (row.superseded_at as string) ?? null,
  };
}

/**
 * List documents. Soft-deleted rows are excluded — their history survives and
 * stays queryable, but they are not part of the archive any more.
 */
export async function listPdfDocuments(): Promise<PdfDocument[]> {
  const { data, error } = await getPdfAdminClient()
    .from("pdf_documents")
    .select(COLUMNS)
    .is("deleted_at", null)
    .order("filename", { ascending: false });

  if (error) throw new Error(`Failed to list documents: ${error.message}`);
  // The generated client cannot infer a shape from a concatenated column list,
  // so it falls back to GenericStringError. The row shape is asserted by
  // toDocument instead.
  return ((data ?? []) as unknown as Row[]).map(toDocument);
}

/** Null rather than throwing: a caller cannot tell absent from soft-deleted. */
export async function getPdfDocument(id: string): Promise<PdfDocument | null> {
  const { data, error } = await getPdfAdminClient()
    .from("pdf_documents")
    .select(COLUMNS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(`Failed to load document: ${error.message}`);
  return data ? toDocument(data as unknown as Row) : null;
}

/**
 * Field-level history, newest first and uncapped. v1 truncated to the most
 * recent 1000 entries across every file, because it was rewriting one JSON
 * document; a table has no such pressure.
 */
export async function getPdfDocumentHistory(
  documentId: string,
): Promise<PdfHistoryEntry[]> {
  const { data, error } = await getPdfAdminClient()
    .from("pdf_document_history")
    .select("id, field, old_value, new_value, change_type, changed_at")
    .eq("document_id", documentId)
    .order("changed_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) throw new Error(`Failed to load history: ${error.message}`);
  return ((data ?? []) as unknown as Row[]).map((row) => ({
    id: Number(row.id),
    field: String(row.field),
    oldValue: row.old_value ?? null,
    newValue: row.new_value ?? null,
    changeType: String(row.change_type),
    changedAt: String(row.changed_at),
  }));
}

/**
 * Does a document row exist at all, including soft-deleted?
 *
 * History outlives the file, so the history route has to distinguish "no such
 * document" from "a document with nothing recorded yet" — otherwise an empty
 * list is ambiguous.
 */
export async function pdfDocumentExists(id: string): Promise<boolean> {
  const { data, error } = await getPdfAdminClient()
    .from("pdf_documents")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to check document: ${error.message}`);
  return Boolean(data);
}

/**
 * Postgres rejects a malformed uuid with a 22P02 rather than returning nothing,
 * so an id from a URL is shape-checked before it reaches a query.
 */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
