import { NextRequest, NextResponse } from "next/server";
import { getPdfDocument, isUuid } from "@/lib/pdf-documents";
import {
  DriveFileMissing,
  DriveReauthorizationRequired,
  downloadDriveFile,
  getDriveHeadRevisionId,
  getValidAccessToken,
} from "@/lib/pdf-drive";
import { SuggestionsFailed, SuggestionsUnavailable, suggestMetadata } from "@/lib/pdf-suggest";

/**
 * AI suggestions for one document (design.md D6). Reads the file from Drive and
 * asks OpenAI; stages nothing and writes nothing. What to keep is the user's
 * call, made through the ordinary edit path.
 */

// A scanned PDF's download plus a vision model's answer can outlast the default.
export const maxDuration = 60;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const document = await getPdfDocument(id);
    if (!document) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const accessToken = await getValidAccessToken();
    // A trashed file still downloads; the revision read is what says it is gone.
    await getDriveHeadRevisionId(accessToken, document.driveFileId);
    const bytes = new Uint8Array(await downloadDriveFile(accessToken, document.driveFileId));

    const suggestions = await suggestMetadata(bytes, {
      filename: document.filename,
      title: document.title,
      subject: document.subject,
      keywords: document.keywords,
    });
    return NextResponse.json({ suggestions });
  } catch (error) {
    if (error instanceof SuggestionsUnavailable) {
      return NextResponse.json({ error: error.message, unavailable: true }, { status: 503 });
    }
    if (error instanceof DriveReauthorizationRequired) {
      return NextResponse.json(
        { error: "Drive access needs re-authorizing.", reauthorize: true },
        { status: 409 },
      );
    }
    if (error instanceof DriveFileMissing) {
      return NextResponse.json({ error: "This file is no longer in Google Drive." }, { status: 410 });
    }
    if (error instanceof SuggestionsFailed) {
      return NextResponse.json({ error: `No suggestions: ${error.message}. Try again.` }, { status: 502 });
    }
    console.error("pdf suggest: failed:", error);
    return NextResponse.json({ error: "No suggestions this time. Try again." }, { status: 502 });
  }
}
