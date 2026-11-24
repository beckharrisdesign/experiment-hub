import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getPdfDocument: vi.fn(),
  getValidAccessToken: vi.fn(),
  getDriveHeadRevisionId: vi.fn(),
  downloadDriveFile: vi.fn(),
  renderPdfPage: vi.fn(),
}));

vi.mock("@/lib/pdf-documents", async () => {
  const actual = await vi.importActual<typeof import("@/lib/pdf-documents")>("@/lib/pdf-documents");
  return { ...actual, getPdfDocument: mocks.getPdfDocument };
});
vi.mock("@/lib/pdf-drive", async () => {
  const actual = await vi.importActual<typeof import("@/lib/pdf-drive")>("@/lib/pdf-drive");
  return {
    ...actual,
    getValidAccessToken: mocks.getValidAccessToken,
    getDriveHeadRevisionId: mocks.getDriveHeadRevisionId,
    downloadDriveFile: mocks.downloadDriveFile,
  };
});
vi.mock("@/lib/pdf-render", async () => {
  const actual = await vi.importActual<typeof import("@/lib/pdf-render")>("@/lib/pdf-render");
  return { ...actual, renderPdfPage: mocks.renderPdfPage };
});

import { GET } from "@/app/api/pdf-documents/id/[id]/pages/[page]/route";
import { DriveFileMissing, DriveReauthorizationRequired } from "@/lib/pdf-drive";
import { PageOutOfRange } from "@/lib/pdf-render";

const ID = "8f2b1c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d";
const call = (id: string, page: string, query = "") =>
  GET(new NextRequest(`http://localhost/api/pdf-documents/id/${id}/pages/${page}${query}`), {
    params: Promise.resolve({ id, page }),
  });

beforeEach(() => {
  for (const m of Object.values(mocks)) m.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.getPdfDocument.mockResolvedValue({ id: ID, driveFileId: "drive-abc" });
  mocks.getValidAccessToken.mockResolvedValue("token-abc");
  mocks.getDriveHeadRevisionId.mockResolvedValue("rev-1");
  mocks.downloadDriveFile.mockResolvedValue(new ArrayBuffer(8));
  mocks.renderPdfPage.mockResolvedValue({
    jpeg: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
    pageCount: 3,
    width: 1120,
    height: 1449,
  });
});

describe("GET /api/pdf-documents/id/[id]/pages/[page]", () => {
  it("draws the page and says how many there are, kept by no cache", async () => {
    const res = await call(ID, "2", "?w=560");
    expect(res.status).toBe(200);
    expect(mocks.renderPdfPage).toHaveBeenCalledWith(expect.any(ArrayBuffer), 2, 560);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("x-page-count")).toBe("3");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]));
  });

  it("keeps the width within bounds", async () => {
    await call(ID, "1", "?w=99999");
    expect(mocks.renderPdfPage.mock.calls[0][2]).toBe(1600);
    await call(ID, "1", "?w=nonsense");
    expect(mocks.renderPdfPage.mock.calls[1][2]).toBe(1120);
  });

  it("refuses a malformed id or page without reading anything", async () => {
    expect((await call("nope", "1")).status).toBe(404);
    expect((await call(ID, "0")).status).toBe(400);
    expect((await call(ID, "1.5")).status).toBe(400);
    expect(mocks.getPdfDocument).not.toHaveBeenCalled();
  });

  it("404s a page past the end, with the count", async () => {
    mocks.renderPdfPage.mockRejectedValue(new PageOutOfRange(3));
    const res = await call(ID, "9");
    expect(res.status).toBe(404);
    expect(res.headers.get("x-page-count")).toBe("3");
  });

  it("410s a trashed file and draws nothing", async () => {
    mocks.getDriveHeadRevisionId.mockRejectedValue(new DriveFileMissing("trashed"));
    expect((await call(ID, "1")).status).toBe(410);
    expect(mocks.renderPdfPage).not.toHaveBeenCalled();
  });

  it("409s when Drive needs signing in again", async () => {
    mocks.getValidAccessToken.mockRejectedValue(new DriveReauthorizationRequired("revoked"));
    expect((await call(ID, "1")).status).toBe(409);
  });

  it("422s a page the server can't draw, so the preview falls back", async () => {
    mocks.renderPdfPage.mockRejectedValue(new Error("bad pdf"));
    expect((await call(ID, "1")).status).toBe(422);
  });
});
