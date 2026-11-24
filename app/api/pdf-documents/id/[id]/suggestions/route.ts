import { NextRequest, NextResponse } from "next/server";
import { getPdfDocument, isUuid } from "@/lib/pdf-documents";
import {
  DriveFileMissing,
  DriveReauthorizationRequired,
  downloadDriveFile,
  getDriveHeadRevisionId,
  getValidAccessToken,
} from "@/lib/pdf-drive";
import { getDocumentText } from "@/lib/pdf-page-text";
import {
  SuggestionsFailed,
  SuggestionsUnavailable,
  suggestMetadata,
  suggestWithUsage,
  type SuggestSource,
} from "@/lib/pdf-suggest";

/**
 * AI suggestions for one document (design.md D6). Reads the file from Drive and
 * asks OpenAI; stages nothing and writes nothing. What to keep is the user's
 * call, made through the ordinary edit path.
 *
 * `?compare=pdf` and `?compare=text` are for task 7h.6, not the button: each
 * answers from that source alone, from a clean slate (what's already filled in
 * would tell both the answer), with what it cost and how long it took.
 */

// A scanned PDF's download plus a vision model's answer can outlast the default.
export const maxDuration = 60;

export async function POST(
  request: NextRequest,
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

    const readPdf = async () => {
      const accessToken = await getValidAccessToken();
      // A trashed file still downloads; the revision read is what says it is gone.
      await getDriveHeadRevisionId(accessToken, document.driveFileId);
      return new Uint8Array(await downloadDriveFile(accessToken, document.driveFileId));
    };

    const compare = request.nextUrl.searchParams.get("compare");
    if (compare === "pdf" || compare === "text") {
      const started = performance.now();
      const source: SuggestSource | null =
        compare === "pdf" ? await readPdf() : await getDocumentText(id, document.driveRevisionId);
      if (!source) {
        return NextResponse.json({ error: "There is too little kept text to go on." }, { status: 422 });
      }
      const read = performance.now();
      const answer = await suggestWithUsage(source, {
        filename: document.filename,
        title: null,
        subject: null,
        keywords: [],
      });
      return NextResponse.json({
        ...answer,
        readMs: Math.round(read - started),
        askMs: Math.round(performance.now() - read),
      });
    }

    const bytes = await readPdf();
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
