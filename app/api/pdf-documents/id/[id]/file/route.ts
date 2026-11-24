import { NextRequest, NextResponse } from "next/server";
import { getPdfDocument, isUuid } from "@/lib/pdf-documents";
import { checkFile, readFile } from "@/lib/pdf-file-read";

/**
 * What a document's file says: its embedded title, subject, author, keywords
 * and page count, read from Drive.
 *
 * The detail page asks for this from the browser, after it has shown itself,
 * when the stored copy may be stale (never edited here, or changed in Drive
 * since). Reading means downloading the whole file, which is why the page no
 * longer waits for it. A problem is data, not an error status: the page shows
 * it in place.
 *
 * Gated by middleware.ts, which returns before this runs.
 */
export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let document;
  try {
    document = await getPdfDocument(id);
  } catch (error) {
    console.error("pdf file values: could not load document:", error);
    return NextResponse.json({ error: "Failed to load document" }, { status: 500 });
  }
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const state = await readFile(document, await checkFile(document));
  return NextResponse.json(state, { headers: { "Cache-Control": "private, no-store" } });
}
