import { NextRequest, NextResponse } from "next/server";
import { getPdfDocument, isUuid } from "@/lib/pdf-documents";

/**
 * One document's metadata and pending state.
 *
 * Gated by `middleware.ts`, which returns before this runs. The literal `id/`
 * segment follows the hub's existing convention (`app/api/experiments/id/[id]`)
 * — two dynamic params at one level build fine and then fail at runtime in
 * production.
 *
 * No bytes are fetched; the preview route handles those separately.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Shape-check before querying: Postgres raises 22P02 on a malformed uuid
  // rather than returning nothing, which would surface as a 500.
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const document = await getPdfDocument(id);
    if (!document) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ document });
  } catch (error) {
    console.error("Failed to load PDF document:", error);
    return NextResponse.json(
      { error: "Failed to load document" },
      { status: 500 },
    );
  }
}
