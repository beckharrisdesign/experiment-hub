import { NextRequest, NextResponse } from "next/server";
import { getPdfDocument, isUuid } from "@/lib/pdf-documents";
import { DriveFileMissing, DriveReauthorizationRequired } from "@/lib/pdf-drive";
import { DriveFileUnstable, parseEdits, stagePdfEdits } from "@/lib/pdf-staging";
import { DocumentReplaced } from "@/lib/pdf-split-plan";

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
    return NextResponse.json({ success: true, document });
  } catch (error) {
    console.error("Failed to load PDF document:", error);
    return NextResponse.json(
      { error: "Failed to load document" },
      { status: 500 },
    );
  }
}

/**
 * Stage field edits — saved here, not yet in the file (task 8.1).
 *
 * Body: any of `{ title, subject, author, keywords }`; only the fields present
 * change, and null or "" clears a text field. Writes nothing to Drive. The
 * first edit after nothing was pending reads the file once to record what it
 * said (task 8.0), which is the only reason this can fail with a Drive error.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }
  const parsed = parseEdits(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const document = await stagePdfEdits(id, parsed.edits);
    if (!document) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, document });
  } catch (error) {
    if (error instanceof DocumentReplaced) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof DriveReauthorizationRequired) {
      return NextResponse.json(
        { error: "Drive access needs re-authorizing", reauthorize: true },
        { status: 409 },
      );
    }
    if (error instanceof DriveFileMissing) {
      return NextResponse.json(
        { error: "This file is no longer in Google Drive" },
        { status: 410 },
      );
    }
    if (error instanceof DriveFileUnstable) {
      return NextResponse.json(
        { error: "The file kept changing in Drive. Try again in a moment." },
        { status: 409 },
      );
    }
    console.error("Failed to stage PDF edits:", error);
    return NextResponse.json({ error: "Could not save the change" }, { status: 500 });
  }
}
