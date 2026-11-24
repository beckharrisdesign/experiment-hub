import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getPdfDocument: vi.fn(),
  getValidAccessToken: vi.fn(),
  getDriveHeadRevisionId: vi.fn(),
  downloadDriveFile: vi.fn(),
  renderPdfPage: vi.fn(),
  shrinkJpeg: vi.fn(),
  getKeptPage: vi.fn(),
  keepPage: vi.fn(),
  after: vi.fn(),
}));

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: mocks.after,
}));
vi.mock("@/lib/pdf-page-store", async () => {
  const actual = await vi.importActual<typeof import("@/lib/pdf-page-store")>("@/lib/pdf-page-store");
  return { ...actual, getKeptPage: mocks.getKeptPage, keepPage: mocks.keepPage };
});

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
  return { ...actual, renderPdfPage: mocks.renderPdfPage, shrinkJpeg: mocks.shrinkJpeg };
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
  mocks.getKeptPage.mockResolvedValue(null);
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

  it("sends a kept page without asking Drive for anything", async () => {
    mocks.getKeptPage.mockResolvedValue({ jpeg: new Blob([new Uint8Array([1, 2])]), pageCount: 19 });
    const res = await call(ID, "2", "?w=560&rev=rev-1");
    expect(mocks.getKeptPage).toHaveBeenCalledWith(ID, "rev-1", 2, "page");
    expect(res.status).toBe(200);
    expect(res.headers.get("x-page-count")).toBe("19");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.getValidAccessToken).not.toHaveBeenCalled();
    expect(mocks.renderPdfPage).not.toHaveBeenCalled();
  });

  it("sends a small copy, and keeps one it had to make", async () => {
    const later = vi.fn();
    mocks.getKeptPage.mockResolvedValue({ jpeg: new Blob([new Uint8Array([1])]), pageCount: 19, later });
    const res = await call(ID, "2", "?size=thumb&rev=rev-1");
    expect(mocks.getKeptPage).toHaveBeenCalledWith(ID, "rev-1", 2, "thumb");
    expect(res.status).toBe(200);
    expect(mocks.after).toHaveBeenCalledWith(later);
  });

  it("draws the page itself when there's none, sending it small and keeping it whole", async () => {
    mocks.shrinkJpeg.mockResolvedValue(new Uint8Array([9]));
    const res = await call(ID, "2", "?size=thumb&rev=rev-1");
    expect(mocks.renderPdfPage.mock.calls[0][2]).toBe(1120);
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([9]));
    await mocks.after.mock.calls[0][0]();
    expect(mocks.keepPage.mock.calls[0][3].jpeg).toEqual(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]));
  });

  it("sends nothing, and draws nothing, when asked only for what's kept", async () => {
    const res = await call(ID, "2", "?size=thumb&rev=rev-1&kept=1");
    expect(res.status).toBe(204);
    expect(mocks.getValidAccessToken).not.toHaveBeenCalled();
    expect(mocks.renderPdfPage).not.toHaveBeenCalled();
  });

  it("404s past the end of kept pages", async () => {
    mocks.getKeptPage.mockResolvedValue({ jpeg: null, pageCount: 19 });
    const res = await call(ID, "20", "?rev=rev-1");
    expect(res.status).toBe(404);
    expect(res.headers.get("x-page-count")).toBe("19");
  });

  it("keeps a page it drew, at the kept size, once Drive confirms the revision", async () => {
    await call(ID, "2", "?w=560&rev=rev-1");
    expect(mocks.renderPdfPage.mock.calls[0][2]).toBe(1120);
    expect(mocks.keepPage).not.toHaveBeenCalled();
    await mocks.after.mock.calls[0][0]();
    expect(mocks.keepPage).toHaveBeenCalledWith(ID, "rev-1", 2, expect.objectContaining({ pageCount: 3 }));
  });

  it("keeps nothing when the file has moved on, or no revision was named", async () => {
    mocks.getDriveHeadRevisionId.mockResolvedValue("rev-2");
    await call(ID, "2", "?rev=rev-1");
    await mocks.after.mock.calls[0][0]();
    expect(mocks.keepPage).not.toHaveBeenCalled();
    await call(ID, "2");
    await call(ID, "2", "?rev=../../x");
    expect(mocks.after).toHaveBeenCalledTimes(1);
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
