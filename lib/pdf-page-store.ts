/**
 * Drawn pages, kept privately (task 7f).
 * openspec/changes/pdf-metadata-viewer-cloud — design.md D14, migration 032.
 *
 * Images, never PDFs: Drive stays the only home for a document's bytes. They
 * sit in a private bucket only the service role can reach, and leave it only
 * through the session-gated page route. They are disposable — every one can be
 * drawn again from Drive — so a failure to keep or find one costs time, never
 * a document, and nothing here is allowed to fail the thing that called it.
 */
import { getPdfAdminClient } from "@/lib/pdf-documents";
import { openPdf, shrinkJpeg } from "@/lib/pdf-render";

export const PAGE_BUCKET = "pdf-pages";

/** The size a page is kept at: the preview at twice its width on screen. */
export const STORED_WIDTH = 1120;

/**
 * And its small copy, for Split: 148 px thumbnails at twice that. Full pages
 * are a quarter of a megabyte each and the function sends slowly, so thirty of
 * them took 18 s to fill a screen of thumbnails (task 7f.5).
 */
export const THUMB_WIDTH = 296;

export type PageSize = "page" | "thumb";

/** Drive revision ids; also what keeps `?rev=` from being anything else. */
export function isRevision(value: string | null | undefined): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,200}$/.test(value);
}

interface PageSet {
  documentId: string;
  revision: string;
  setId: string;
  pageCount: number | null;
  drawnAt: string | null;
  /** When every page's text was kept too (lib/pdf-page-text.ts). */
  textAt: string | null;
  createdAt: string;
}

const COLUMNS = "document_id, drive_revision, set_id, page_count, drawn_at, text_at, created_at";

function toSet(row: Record<string, unknown>): PageSet {
  return {
    documentId: String(row.document_id),
    revision: String(row.drive_revision),
    setId: String(row.set_id),
    pageCount: (row.page_count as number) ?? null,
    drawnAt: (row.drawn_at as string) ?? null,
    textAt: (row.text_at as string) ?? null,
    createdAt: String(row.created_at),
  };
}

const sets = () => getPdfAdminClient().from("pdf_page_sets");
const bucket = () => getPdfAdminClient().storage.from(PAGE_BUCKET);
const objectPath = (setId: string, page: number, size: PageSize = "page") =>
  `${setId}/${page}${size === "thumb" ? ".t" : ""}.jpg`;

async function findSet(documentId: string, revision: string): Promise<PageSet | null> {
  const { data, error } = await sets()
    .select(COLUMNS)
    .eq("document_id", documentId)
    .eq("drive_revision", revision)
    .maybeSingle();
  if (error) throw new Error(`Could not read page sets: ${error.message}`);
  return data ? toSet(data as Record<string, unknown>) : null;
}

/** The set for this version, made if it isn't there. Two at once agree on one. */
async function ensureSet(
  documentId: string,
  revision: string,
  pageCount: number,
): Promise<PageSet> {
  const { error } = await sets().upsert(
    { document_id: documentId, drive_revision: revision, page_count: pageCount },
    { onConflict: "document_id,drive_revision", ignoreDuplicates: true },
  );
  if (error) throw new Error(`Could not make a page set: ${error.message}`);
  const set = await findSet(documentId, revision);
  if (!set) throw new Error("The page set disappeared");
  return set;
}

async function upload(
  setId: string,
  page: number,
  jpeg: Uint8Array,
  size: PageSize = "page",
): Promise<void> {
  const { error } = await bucket().upload(objectPath(setId, page, size), jpeg, {
    contentType: "image/jpeg",
    upsert: true,
    // The bucket's own copy is the one copy: nothing in front of it keeps one.
    cacheControl: "0",
  });
  if (error) throw new Error(`Could not keep page ${page}: ${error.message}`);
}

/** Everything in a set: pages and their small copies. */
async function objectsIn(setId: string): Promise<string[]> {
  const names: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await bucket().list(setId, { limit: 1000, offset });
    if (error) throw new Error(`Could not list kept pages: ${error.message}`);
    for (const object of data ?? []) names.push(object.name);
    if ((data ?? []).length < 1000) return names;
  }
}

/** Page numbers already kept in a set. */
async function pagesKept(setId: string): Promise<Set<number>> {
  const kept = new Set<number>();
  for (const name of await objectsIn(setId)) {
    const page = name.match(/^(\d+)\.jpg$/);
    if (page) kept.add(Number(page[1]));
  }
  return kept;
}

/** A page's small copy. Never worth failing for: it can be made when asked for. */
async function keepThumb(setId: string, page: number, jpeg: Uint8Array): Promise<void> {
  try {
    await upload(setId, page, await shrinkJpeg(jpeg, THUMB_WIDTH), "thumb");
  } catch (error) {
    console.warn(`pdf pages: could not keep the small copy of page ${page}:`, error);
  }
}

// ---------------------------------------------------------------------------
// One page, for the page route
// ---------------------------------------------------------------------------

export interface KeptPage {
  /** Null when the page asked for is past the end. */
  jpeg: Blob | null;
  pageCount: number;
  /** Work for after the answer: keeping a small copy that had to be made. */
  later?: () => Promise<void>;
}

/** A kept page, or null: draw it. */
export async function getKeptPage(
  documentId: string,
  revision: string,
  page: number,
  size: PageSize = "page",
): Promise<KeptPage | null> {
  try {
    const set = await findSet(documentId, revision);
    if (!set || set.pageCount === null) return null;
    if (page > set.pageCount) return { jpeg: null, pageCount: set.pageCount };
    if (size === "thumb") {
      const small = await bucket().download(objectPath(set.setId, page, "thumb"));
      if (!small.error && small.data) return { jpeg: small.data, pageCount: set.pageCount };
    }
    const { data, error } = await bucket().download(objectPath(set.setId, page));
    if (error || !data) return null;
    if (size === "page") return { jpeg: data, pageCount: set.pageCount };
    // Kept before small copies were, or its small copy couldn't be: made from
    // the page, with nothing asked of Drive.
    const thumb = await shrinkJpeg(new Uint8Array(await data.arrayBuffer()), THUMB_WIDTH);
    return {
      jpeg: new Blob([thumb as BlobPart], { type: "image/jpeg" }),
      pageCount: set.pageCount,
      later: () =>
        upload(set.setId, page, thumb, "thumb").catch((err) =>
          console.warn(`pdf pages: could not keep the small copy of page ${page}:`, err),
        ),
    };
  } catch (error) {
    console.warn(`pdf pages: could not look for page ${page} of ${documentId}:`, error);
    return null;
  }
}

/** Keep a page drawn on request. The caller has checked the revision is right. */
export async function keepPage(
  documentId: string,
  revision: string,
  page: number,
  drawn: { jpeg: Uint8Array; pageCount: number },
): Promise<void> {
  try {
    const set = await ensureSet(documentId, revision, drawn.pageCount);
    await upload(set.setId, page, drawn.jpeg);
    await keepThumb(set.setId, page, drawn.jpeg);
  } catch (error) {
    console.warn(`pdf pages: could not keep page ${page} of ${documentId}:`, error);
  }
}

// ---------------------------------------------------------------------------
// A commit: new revision, same pages
// ---------------------------------------------------------------------------

/**
 * A commit from here writes metadata and leaves the pages alone, so the new
 * revision takes over the old one's images. Without this every commit would
 * throw away a document's drawn pages.
 */
export async function carryPages(
  documentId: string,
  fromRevision: string | null,
  toRevision: string | null,
): Promise<void> {
  if (!fromRevision || !toRevision || fromRevision === toRevision) return;
  try {
    const set = await findSet(documentId, fromRevision);
    if (!set) return;
    const { error } = await sets().upsert(
      {
        document_id: documentId,
        drive_revision: toRevision,
        set_id: set.setId,
        page_count: set.pageCount,
        drawn_at: set.drawnAt,
        text_at: set.textAt,
      },
      { onConflict: "document_id,drive_revision" },
    );
    if (error) throw new Error(error.message);
  } catch (error) {
    console.warn(`pdf pages: could not carry the pages of ${documentId}:`, error);
  }
}

// ---------------------------------------------------------------------------
// The sync: draw ahead, and clear out
// ---------------------------------------------------------------------------

export interface WantedDocument {
  id: string;
  driveFileId: string;
  /** The revision Drive listed for it just now. */
  revision: string;
  pageCount: number | null;
}

export interface PageSyncOptions {
  wanted: WantedDocument[];
  download: (driveFileId: string) => Promise<ArrayBuffer>;
  /** Drive's revision now, to be sure of what was downloaded. */
  headRevision: (driveFileId: string) => Promise<string | null>;
  /** Stop starting pages once this is true. */
  outOfTime: () => boolean;
  /** Sets made after this moment are left alone by the clear-out. */
  startedAt: Date;
}

export interface PageSyncResult {
  /** Pages drawn and kept this run. */
  pagesDrawn: number;
  /** Documents whose pages aren't all kept yet. */
  pagesWaiting: number;
  /** Page sets cleared out: their document or version is gone. */
  setsRemoved: number;
}

/**
 * Remove sets for versions Drive no longer lists, or documents no longer in
 * the folder. Images go before rows: a row left behind is tried again, but
 * images with no row would never be found.
 */
async function clearOut(
  all: PageSet[],
  wanted: Map<string, WantedDocument>,
  startedAt: Date,
): Promise<number> {
  const stale = all.filter(
    (s) =>
      wanted.get(s.documentId)?.revision !== s.revision &&
      // A commit or a visit during this run may know a newer revision than the
      // listing does.
      Date.parse(s.createdAt) < startedAt.getTime(),
  );
  const staleRows = new Set(stale);
  const inUse = new Set(all.filter((s) => !staleRows.has(s)).map((s) => s.setId));
  let removed = 0;
  for (const set of stale) {
    try {
      if (!inUse.has(set.setId)) {
        const paths = (await objectsIn(set.setId)).map((name) => `${set.setId}/${name}`);
        for (let i = 0; i < paths.length; i += 500) {
          const { error } = await bucket().remove(paths.slice(i, i + 500));
          if (error) throw new Error(error.message);
        }
        const { error } = await getPdfAdminClient()
          .from("pdf_page_text")
          .delete()
          .eq("set_id", set.setId);
        if (error) throw new Error(error.message);
      }
      const { error } = await sets()
        .delete()
        .eq("document_id", set.documentId)
        .eq("drive_revision", set.revision);
      if (error) throw new Error(error.message);
      removed += 1;
    } catch (error) {
      console.warn(`pdf pages: could not clear out pages of ${set.documentId}:`, error);
    }
  }
  return removed;
}

async function finishSet(set: PageSet, pageCount: number | null): Promise<void> {
  const { error } = await sets()
    .update({ drawn_at: new Date().toISOString(), page_count: pageCount })
    .eq("document_id", set.documentId)
    .eq("drive_revision", set.revision);
  if (error) throw new Error(`Could not finish a page set: ${error.message}`);
}

/** Draw what's missing of one document. True when all its pages are kept. */
async function drawDocument(
  doc: WantedDocument,
  { download, headRevision, outOfTime }: PageSyncOptions,
  onPage: () => void,
): Promise<boolean> {
  const bytes = await download(doc.driveFileId);
  // Listed before the download and unchanged after it: these are its bytes.
  if ((await headRevision(doc.driveFileId)) !== doc.revision) return false;

  let pdf: Awaited<ReturnType<typeof openPdf>>;
  try {
    pdf = await openPdf(bytes);
  } catch (error) {
    // Not drawable here: remember, so it isn't downloaded every hour. The
    // preview still falls back to the browser's pdf.js.
    console.warn(`pdf pages: ${doc.id} can't be drawn:`, error);
    await finishSet(await ensureSet(doc.id, doc.revision, 1), null);
    return true;
  }
  try {
    const set = await ensureSet(doc.id, doc.revision, pdf.pageCount);
    const kept = await pagesKept(set.setId);
    for (let n = 1; n <= pdf.pageCount; n++) {
      if (kept.has(n)) continue;
      if (outOfTime()) return false;
      let jpeg: Uint8Array;
      try {
        jpeg = (await pdf.draw(n, STORED_WIDTH)).jpeg;
      } catch (error) {
        console.warn(`pdf pages: page ${n} of ${doc.id} can't be drawn:`, error);
        await finishSet(set, null);
        return true;
      }
      await upload(set.setId, n, jpeg);
      await keepThumb(set.setId, n, jpeg);
      onPage();
    }
    await finishSet(set, pdf.pageCount);
    return true;
  } finally {
    await pdf.close();
  }
}

/**
 * Clear out what's gone, then draw what's missing until time runs out. One
 * document at a time: drawing is all CPU, so more at once would only hold more
 * in memory. Short documents first, so most are ready soonest.
 */
export async function syncPages(options: PageSyncOptions): Promise<PageSyncResult> {
  const { data, error } = await sets().select(COLUMNS);
  if (error) throw new Error(`Could not read page sets: ${error.message}`);
  const all = ((data ?? []) as unknown as Record<string, unknown>[]).map(toSet);

  const wanted = new Map(options.wanted.map((d) => [d.id, d] as const));
  const setsRemoved = await clearOut(all, wanted, options.startedAt);

  const done = new Set(
    all.filter((s) => s.drawnAt !== null).map((s) => `${s.documentId}@${s.revision}`),
  );
  const queue = options.wanted
    .filter((d) => !done.has(`${d.id}@${d.revision}`))
    .sort((a, b) => (a.pageCount ?? Infinity) - (b.pageCount ?? Infinity) || 0);

  let pagesDrawn = 0;
  let waiting = queue.length;
  for (const doc of queue) {
    if (options.outOfTime()) break;
    try {
      if (await drawDocument(doc, options, () => (pagesDrawn += 1))) waiting -= 1;
    } catch (err) {
      console.warn(`pdf pages: could not draw ${doc.id}:`, err);
    }
  }
  return { pagesDrawn, pagesWaiting: waiting, setsRemoved };
}
