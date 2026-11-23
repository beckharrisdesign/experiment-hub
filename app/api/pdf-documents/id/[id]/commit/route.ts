import { NextRequest, NextResponse } from "next/server";
import { isUuid } from "@/lib/pdf-documents";
import {
  DriveFileMissing,
  DriveReauthorizationRequired,
  DriveWriteRefused,
} from "@/lib/pdf-drive";
import { PdfNotWritable } from "@/lib/pdf-embedded";
import { CommitConflict, CommitNotRecorded, commitPdfDocument } from "@/lib/pdf-commit";
import { DocumentReplaced } from "@/lib/pdf-split-plan";

/**
 * Write a document's staged edits into its PDF in Drive (task 8.2).
 *
 * Every refusal says the edits are kept, because they are: nothing in the
 * database changes unless the upload succeeded (design.md D4).
 */

// A download and an upload of a scanned PDF can outlast the default limit.
export const maxDuration = 60;

const KEPT = "Your edits are kept.";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const result = await commitPdfDocument(id);
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof DocumentReplaced) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof CommitConflict) {
      return NextResponse.json(
        {
          error: `Not written: the file changed in Drive after you started editing. ${KEPT}`,
          conflict: true,
        },
        { status: 409 },
      );
    }
    if (error instanceof DriveReauthorizationRequired) {
      return NextResponse.json(
        { error: `Drive access needs re-authorizing. ${KEPT}`, reauthorize: true },
        { status: 409 },
      );
    }
    if (error instanceof DriveFileMissing) {
      return NextResponse.json(
        { error: `This file is no longer in Google Drive. ${KEPT}` },
        { status: 410 },
      );
    }
    if (error instanceof PdfNotWritable) {
      return NextResponse.json(
        { error: `${error.message}. ${KEPT}` },
        { status: 422 },
      );
    }
    if (error instanceof DriveWriteRefused) {
      return NextResponse.json(
        { error: `Drive refused to change this file. It may be shared with you read-only. ${KEPT}` },
        { status: 502 },
      );
    }
    if (error instanceof CommitNotRecorded) {
      return NextResponse.json(
        {
          error:
            "The file was written to Drive, but this page couldn't record it. Reload before editing again.",
        },
        { status: 500 },
      );
    }
    console.error("Failed to commit PDF edits:", error);
    return NextResponse.json(
      { error: `Could not write to Drive. ${KEPT}` },
      { status: 502 },
    );
  }
}
