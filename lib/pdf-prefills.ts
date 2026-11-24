/**
 * Prefilled values, kept until a person accepts or dismisses them (task 7i).
 * openspec/changes/pdf-metadata-viewer-cloud — design.md D16, migration 034.
 *
 * Never an edit: they live in a table of their own, so nothing that counts,
 * commits or discards edits can see them. Accepting is an ordinary edit, which
 * is also what stops them being shown: they are only for untouched documents.
 */
import { getPdfAdminClient, type PdfDocument } from "@/lib/pdf-documents";
import { loadTaxonomy } from "@/lib/pdf-taxonomy";
import type { KeptPageText } from "@/lib/pdf-page-text";
import { canPrefill, makePrefill, type Prefill } from "@/lib/pdf-prefill";
import { listedValues } from "@/lib/pdf-shown-values";

const prefills = () => getPdfAdminClient().from("pdf_prefills");

function toPrefill(row: Record<string, unknown>): Prefill {
  return {
    title: (row.title as string) ?? null,
    keywords: Array.isArray(row.keywords) ? row.keywords.map(String) : [],
    why: (row.why as Record<string, string>) ?? {},
  };
}

/**
 * What is waiting, by document, for the documents given: only for the version
 * Drive last listed, and only while the document is untouched. A failure here
 * means nothing is prefilled, never that a page doesn't load.
 */
export async function openPrefills(documents: PdfDocument[]): Promise<Map<string, Prefill>> {
  const open = new Map<string, Prefill>();
  const eligible = new Map(documents.filter(canPrefill).map((d) => [d.id, d] as const));
  if (eligible.size === 0) return open;
  try {
    const { data, error } = await prefills()
      .select("document_id, drive_revision, title, keywords, why")
      .is("dismissed_at", null);
    if (error) throw new Error(error.message);
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      const d = eligible.get(String(row.document_id));
      if (d && d.driveRevisionId === row.drive_revision) open.set(d.id, toPrefill(row));
    }
  } catch (error) {
    console.warn("pdf prefill: could not read what is waiting:", error);
  }
  return open;
}

/** Not this, not for this version of the file. False when there was nothing to dismiss. */
export async function dismissPrefill(documentId: string, revision: string): Promise<boolean> {
  const { data, error } = await prefills()
    .update({ dismissed_at: new Date().toISOString() })
    .eq("document_id", documentId)
    .eq("drive_revision", revision)
    .is("dismissed_at", null)
    .select("document_id");
  if (error) throw new Error(`Could not dismiss: ${error.message}`);
  return (data ?? []).length > 0;
}

async function keptText(
  documents: PdfDocument[],
): Promise<Map<string, { revision: string; pages: KeptPageText[] }>> {
  const ids = documents.map((d) => d.id);
  const { data: sets, error } = await getPdfAdminClient()
    .from("pdf_page_sets")
    .select("document_id, drive_revision, set_id")
    .in("document_id", ids)
    .not("text_at", "is", null);
  if (error) throw new Error(`Could not read page sets: ${error.message}`);
  const revisions = new Map(documents.map((d) => [d.id, d.driveRevisionId] as const));
  const bySet = new Map<string, { id: string; revision: string }>();
  for (const row of (sets ?? []) as Record<string, unknown>[]) {
    const id = String(row.document_id);
    if (revisions.get(id) === row.drive_revision) {
      bySet.set(String(row.set_id), { id, revision: String(row.drive_revision) });
    }
  }
  const text = new Map<string, { revision: string; pages: KeptPageText[] }>();
  if (bySet.size === 0) return text;
  const { data, error: textError } = await getPdfAdminClient()
    .from("pdf_page_text")
    .select("set_id, page, text, source, confidence")
    .in("set_id", [...bySet.keys()]);
  if (textError) throw new Error(`Could not read kept text: ${textError.message}`);
  for (const row of (data ?? []) as (KeptPageText & { set_id: string })[]) {
    const { id, revision } = bySet.get(String(row.set_id))!;
    const entry = text.get(id) ?? { revision, pages: [] };
    entry.pages.push({ page: row.page, text: row.text, source: row.source, confidence: row.confidence });
    text.set(id, entry);
  }
  return text;
}

export interface PrefillSyncResult {
  /** Documents with something waiting after this run. */
  prefilled: number;
}

/**
 * Work out what each untouched document's text says. Run again every hour, so a
 * vendor added to Entities is found on the documents already here; what was
 * dismissed is left alone.
 */
export async function syncPrefills(documents: PdfDocument[]): Promise<PrefillSyncResult> {
  const eligible = documents.filter(canPrefill);
  if (eligible.length === 0) return { prefilled: 0 };
  const text = await keptText(eligible);
  if (text.size === 0) return { prefilled: 0 };
  const taxonomy = await loadTaxonomy();

  const { data: kept, error } = await prefills().select("document_id, drive_revision, dismissed_at");
  if (error) throw new Error(`Could not read prefills: ${error.message}`);
  const dismissed = new Set<string>();
  const waiting = new Set<string>();
  for (const row of (kept ?? []) as Record<string, unknown>[]) {
    (row.dismissed_at ? dismissed : waiting).add(`${row.document_id}@${row.drive_revision}`);
  }

  let prefilled = 0;
  for (const d of eligible) {
    const entry = text.get(d.id);
    if (!entry) continue;
    const key = `${d.id}@${entry.revision}`;
    if (dismissed.has(key)) continue;
    const prefill = makePrefill(
      { filename: d.filename, title: listedValues(d).title, pages: entry.pages },
      {
        entities: taxonomy,
        documentTypes: taxonomy.documentTypes,
        categories: taxonomy.categories,
        specials: taxonomy.specials,
      },
    );
    if (prefill) {
      const { error: keepError } = await prefills().upsert(
        {
          document_id: d.id,
          drive_revision: entry.revision,
          title: prefill.title,
          keywords: prefill.keywords,
          why: prefill.why,
        },
        { onConflict: "document_id,drive_revision" },
      );
      if (keepError) throw new Error(`Could not keep a prefill: ${keepError.message}`);
      prefilled += 1;
    } else if (waiting.has(key)) {
      const { error: dropError } = await prefills()
        .delete()
        .eq("document_id", d.id)
        .eq("drive_revision", entry.revision);
      if (dropError) throw new Error(`Could not drop a prefill: ${dropError.message}`);
    }
  }
  return { prefilled };
}
