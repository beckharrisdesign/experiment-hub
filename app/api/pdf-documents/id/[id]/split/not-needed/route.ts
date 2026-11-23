import { NextRequest, NextResponse } from "next/server";
import { isUuid } from "@/lib/pdf-documents";
import { markSplitNotNeeded } from "@/lib/pdf-split";

/** "It's one document": stop offering this document for splitting (D11). */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const found = await markSplitNotNeeded(id);
    if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("pdf split: could not mark as one document:", error);
    return NextResponse.json({ error: "Not saved. Try again." }, { status: 500 });
  }
}
