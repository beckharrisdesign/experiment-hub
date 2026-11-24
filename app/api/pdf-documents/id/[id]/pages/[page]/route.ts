import { after, NextRequest, NextResponse } from "next/server";
import { getPdfDocument, isUuid } from "@/lib/pdf-documents";
import {
  DriveFileMissing,
  DriveReauthorizationRequired,
  downloadDriveFile,
  getDriveHeadRevisionId,
  getValidAccessToken,
} from "@/lib/pdf-drive";
import {
  getKeptPage,
  isRevision,
  keepPage,
  STORED_WIDTH,
  THUMB_WIDTH,
  type PageSize,
} from "@/lib/pdf-page-store";
import { PageOutOfRange, renderPdfPage, shrinkJpeg } from "@/lib/pdf-render";

/**
 * One page of a document as a JPEG — the detail preview's pages (task 7c.3,
 * Figma 02.12) and the splitter's.
 *
 * With `?rev=`, the Drive revision the page was rendered against, a kept image
 * is sent if there is one (task 7f, design.md D14) and Drive isn't asked for
 * anything. Otherwise the page is drawn here, and kept for next time.
 * `?size=thumb` sends its small copy instead, for the splitter, and for the
 * preview to show first (7f.5); `?kept=1` sends nothing rather than draw.
 *
 * The function gets the file from Drive fast and sends to the browser slowly
 * (measured: whole 9.35 MB scan from Drive in under 0.5 s once started, then
 * about 0.85 MB/s on to the browser), so the page is drawn here and only the
 * image travels. `X-Page-Count` tells the preview how many
 * pages to ask for.
 *
 * Gated by middleware.ts, like the content route.
 */
export const maxDuration = 60;

const MIN_WIDTH = 120;
const MAX_WIDTH = 1600;
const DEFAULT_WIDTH = STORED_WIDTH;

function imageHeaders(size: number, pageCount: number) {
  return {
    "Content-Type": "image/jpeg",
    "Content-Length": String(size),
    "X-Page-Count": String(pageCount),
    // Personal documents: kept by no cache, the browser's included.
    "Cache-Control": "private, no-store",
  };
}

function pastTheEnd(pageCount: number) {
  return NextResponse.json(
    { error: new PageOutOfRange(pageCount).message, pageCount },
    { status: 404, headers: { "X-Page-Count": String(pageCount) } },
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; page: string }> },
) {
  const started = performance.now();
  const since = () => Math.round(performance.now() - started);
  const { id, page } = await params;
  const pageNumber = Number(page);
  if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    return NextResponse.json({ error: "Pages are numbered from 1" }, { status: 400 });
  }
  const askedWidth = Number(request.nextUrl.searchParams.get("w") ?? DEFAULT_WIDTH);
  const width = Number.isFinite(askedWidth)
    ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(askedWidth)))
    : DEFAULT_WIDTH;
  const rev = request.nextUrl.searchParams.get("rev");
  const revision = isRevision(rev) ? rev : null;
  const size: PageSize = request.nextUrl.searchParams.get("size") === "thumb" ? "thumb" : "page";

  if (revision) {
    const kept = await getKeptPage(id, revision, pageNumber, size);
    if (kept && !kept.jpeg) return pastTheEnd(kept.pageCount);
    if (kept?.jpeg) {
      if (kept.later) after(kept.later);
      return new NextResponse(kept.jpeg, {
        status: 200,
        headers: {
          ...imageHeaders(kept.jpeg.size, kept.pageCount),
          "Server-Timing": `kept;dur=${since()}`,
        },
      });
    }
  }

  if (request.nextUrl.searchParams.get("kept") === "1") {
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": "private, no-store" } });
  }

  let document;
  try {
    document = await getPdfDocument(id);
  } catch (error) {
    console.error("pdf page: could not load document:", error);
    return NextResponse.json({ error: "Failed to load document" }, { status: 500 });
  }
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let bytes: ArrayBuffer;
  let driveMs = 0;
  try {
    const accessToken = await getValidAccessToken();
    // A trashed file still downloads; only the revision read reports it gone.
    const [revision, download] = await Promise.allSettled([
      getDriveHeadRevisionId(accessToken, document.driveFileId),
      downloadDriveFile(accessToken, document.driveFileId),
    ]);
    if (revision.status === "rejected") throw revision.reason;
    if (download.status === "rejected") throw download.reason;
    bytes = download.value;
    driveMs = since();
  } catch (error) {
    if (error instanceof DriveReauthorizationRequired) {
      return NextResponse.json(
        { error: "Drive access needs re-authorizing. Sign in again." },
        { status: 409 },
      );
    }
    if (error instanceof DriveFileMissing) {
      return NextResponse.json({ error: "This file is no longer in Google Drive" }, { status: 410 });
    }
    console.error("pdf page: Drive download failed:", error);
    return NextResponse.json({ error: "Could not read the file from Drive" }, { status: 502 });
  }

  try {
    // Kept pages are one size, so one drawn to be kept is that size too.
    const rendered = await renderPdfPage(
      bytes,
      pageNumber,
      revision ? STORED_WIDTH : size === "thumb" ? THUMB_WIDTH : width,
    );
    const jpeg =
      revision && size === "thumb" ? await shrinkJpeg(rendered.jpeg, THUMB_WIDTH) : rendered.jpeg;
    if (revision) {
      const { driveFileId } = document;
      // After the answer is sent. The revision was read before this download
      // started; if Drive still says the same now, these were its bytes.
      after(async () => {
        try {
          const head = await getDriveHeadRevisionId(await getValidAccessToken(), driveFileId);
          if (head === revision) await keepPage(id, revision, pageNumber, rendered);
        } catch (error) {
          console.warn(`pdf page: could not keep page ${pageNumber} of ${id}:`, error);
        }
      });
    }
    return new NextResponse(jpeg as unknown as BodyInit, {
      status: 200,
      headers: {
        ...imageHeaders(jpeg.byteLength, rendered.pageCount),
        "Server-Timing": `drive;dur=${driveMs}, draw;dur=${since() - driveMs}`,
      },
    });
  } catch (error) {
    if (error instanceof PageOutOfRange) {
      return pastTheEnd(error.pageCount);
    }
    console.error(`pdf page: could not draw page ${pageNumber} of ${id}:`, error);
    // 422: the file is there but can't be drawn here; the preview falls back to pdf.js.
    return NextResponse.json({ error: "This page couldn't be drawn" }, { status: 422 });
  }
}
