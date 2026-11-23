import { NextRequest, NextResponse } from "next/server";
import { isUuid } from "@/lib/pdf-documents";
import {
  DriveFileMissing,
  DriveReauthorizationRequired,
  DriveWriteRefused,
} from "@/lib/pdf-drive";
import { PdfNotWritable } from "@/lib/pdf-embedded";
import {
  AlreadySplit,
  InvalidSplit,
  SplitConflict,
  SplitNotRecorded,
  splitPdfDocument,
} from "@/lib/pdf-split";

/**
 * Split a document after the given pages (tasks 7b.2, 7b.3). Body:
 * `{ breaks: number[] }`, each "split after this page". Every refusal before
 * the record step leaves Drive and the database as they were.
 */

// A download, N uploads and the record step for a scanned PDF.
export const maxDuration = 60;

function parseBreaks(body: unknown): number[] | null {
  const breaks = (body as { breaks?: unknown } | null)?.breaks;
  if (!Array.isArray(breaks) || breaks.length === 0) return null;
  if (!breaks.every((b) => Number.isInteger(b))) return null;
  return breaks as number[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const breaks = parseBreaks(await request.json().catch(() => null));
  if (!breaks) {
    return NextResponse.json({ error: "Choose at least one place to split." }, { status: 400 });
  }

  try {
    const result = await splitPdfDocument(id, breaks);
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof InvalidSplit) {
      return NextResponse.json({ error: `${error.message}.` }, { status: 400 });
    }
    if (error instanceof AlreadySplit) {
      return NextResponse.json({ error: "This document was already split." }, { status: 409 });
    }
    if (error instanceof SplitConflict) {
      return NextResponse.json(
        { error: "Not split: the file changed in Drive. Nothing was created.", conflict: true },
        { status: 409 },
      );
    }
    if (error instanceof DriveReauthorizationRequired) {
      return NextResponse.json(
        { error: "Drive access needs re-authorizing. Nothing was created.", reauthorize: true },
        { status: 409 },
      );
    }
    if (error instanceof DriveFileMissing) {
      return NextResponse.json({ error: "This file is no longer in Google Drive." }, { status: 410 });
    }
    if (error instanceof PdfNotWritable) {
      return NextResponse.json({ error: `${error.message}.` }, { status: 422 });
    }
    if (error instanceof DriveWriteRefused) {
      return NextResponse.json(
        { error: "Drive refused to create the new files. Nothing was left behind." },
        { status: 502 },
      );
    }
    if (error instanceof SplitNotRecorded) {
      return NextResponse.json(
        {
          error:
            "The new files are in Drive, but this page couldn't record the split. Reload before splitting again.",
        },
        { status: 500 },
      );
    }
    console.error("pdf split: failed:", error);
    return NextResponse.json({ error: "Not split. Nothing was left behind. Try again." }, { status: 502 });
  }
}
