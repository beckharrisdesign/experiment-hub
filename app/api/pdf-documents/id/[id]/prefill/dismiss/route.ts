import { NextRequest, NextResponse } from "next/server";
import { isUuid } from "@/lib/pdf-documents";
import { isRevision } from "@/lib/pdf-page-store";
import { dismissPrefill } from "@/lib/pdf-prefills";

/**
 * Dismiss what was prefilled for one version of a document (task 7i). It isn't
 * prefilled again for that version; nothing else changes. Accepting needs no
 * route of its own: it is an ordinary edit. Gated by middleware.ts.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await request.json().catch(() => null)) as { revision?: unknown } | null;
  const revision = body?.revision;
  if (typeof revision !== "string" || !isRevision(revision)) {
    return NextResponse.json({ error: "Reload the page, then dismiss." }, { status: 400 });
  }
  try {
    // Already dismissed is as good as dismissed.
    await dismissPrefill(id, revision);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("pdf prefill: could not dismiss:", error);
    return NextResponse.json({ error: "Not dismissed. Try again." }, { status: 500 });
  }
}
