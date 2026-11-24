import { NextRequest, NextResponse } from "next/server";
import { getPdfDocument, isUuid } from "@/lib/pdf-documents";
import {
  DriveFileMissing,
  DriveReauthorizationRequired,
  downloadDriveFile,
  getDriveHeadRevisionId,
  getValidAccessToken,
} from "@/lib/pdf-drive";
import { PageOutOfRange, renderPdfPage } from "@/lib/pdf-render";

/**
 * One page of a document, drawn as a JPEG on the server — the detail
 * preview's pages (task 7c.3, Figma 02.12).
 *
 * The function gets the file from Drive fast and sends to the browser slowly
 * (measured: whole 9.35 MB scan from Drive in under 0.5 s once started, then
 * about 0.85 MB/s on to the browser), so the page is drawn here and only the
 * image travels. Nothing is stored. `X-Page-Count` tells the preview how many
 * pages to ask for.
 *
 * Gated by middleware.ts, like the content route.
 */
export const maxDuration = 60;

const MIN_WIDTH = 120;
const MAX_WIDTH = 1600;
const DEFAULT_WIDTH = 1120;

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
    const rendered = await renderPdfPage(bytes, pageNumber, width);
    return new NextResponse(rendered.jpeg as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(rendered.jpeg.byteLength),
        "X-Page-Count": String(rendered.pageCount),
        // Personal documents: kept by no cache, the browser's included.
        "Cache-Control": "private, no-store",
        "Server-Timing": `drive;dur=${driveMs}, draw;dur=${since() - driveMs}`,
      },
    });
  } catch (error) {
    if (error instanceof PageOutOfRange) {
      return NextResponse.json(
        { error: error.message, pageCount: error.pageCount },
        { status: 404, headers: { "X-Page-Count": String(error.pageCount) } },
      );
    }
    console.error(`pdf page: could not draw page ${pageNumber} of ${id}:`, error);
    // 422: the file is there but can't be drawn here; the preview falls back to pdf.js.
    return NextResponse.json({ error: "This page couldn't be drawn" }, { status: 422 });
  }
}
