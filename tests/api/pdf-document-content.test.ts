import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getPdfDocument: vi.fn(),
  getValidAccessToken: vi.fn(),
  downloadDriveFile: vi.fn(),
}));

vi.mock("@/lib/pdf-documents", async () => {
  const actual = await vi.importActual<typeof import("@/lib/pdf-documents")>(
    "@/lib/pdf-documents",
  );
  return { ...actual, getPdfDocument: mocks.getPdfDocument };
});

vi.mock("@/lib/pdf-drive", async () => {
  const actual = await vi.importActual<typeof import("@/lib/pdf-drive")>(
    "@/lib/pdf-drive",
  );
  return {
    ...actual,
    getValidAccessToken: mocks.getValidAccessToken,
    downloadDriveFile: mocks.downloadDriveFile,
  };
});

import { GET } from "@/app/api/pdf-documents/id/[id]/content/route";
import {
  DriveFileMissing,
  DriveReauthorizationRequired,
} from "@/lib/pdf-drive";

const ID = "8f2b1c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d";
const DOC = {
  id: ID,
  driveFileId: "drive-abc",
  filename: "2026-03-14 — Invoice — Utilities.pdf",
};

function call(id: string) {
  return GET(new NextRequest(`http://localhost/api/pdf-documents/id/${id}/content`), {
    params: Promise.resolve({ id }),
  });
}

beforeEach(() => {
  for (const m of Object.values(mocks)) m.mockReset();
  mocks.getValidAccessToken.mockResolvedValue("token-abc");
});

describe("GET /api/pdf-documents/id/[id]/content", () => {
  it("404s a malformed id without touching the store or Drive", async () => {
    const res = await call("not-a-uuid");
    expect(res.status).toBe(404);
    expect(mocks.getPdfDocument).not.toHaveBeenCalled();
    expect(mocks.downloadDriveFile).not.toHaveBeenCalled();
  });

  it("404s an unknown document without touching Drive", async () => {
    mocks.getPdfDocument.mockResolvedValue(null);
    const res = await call(ID);
    expect(res.status).toBe(404);
    expect(mocks.downloadDriveFile).not.toHaveBeenCalled();
  });

  it("streams the bytes inline as a PDF that no cache keeps", async () => {
    mocks.getPdfDocument.mockResolvedValue(DOC);
    mocks.downloadDriveFile.mockResolvedValue(
      new TextEncoder().encode("%PDF-1.7").buffer,
    );

    const res = await call(ID);

    expect(res.status).toBe(200);
    expect(mocks.downloadDriveFile).toHaveBeenCalledWith("token-abc", "drive-abc");
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("content-disposition")).toBe(
      `inline; filename*=UTF-8''${encodeURIComponent(DOC.filename)}`,
    );
    expect(await res.text()).toBe("%PDF-1.7");
  });

  it("never leaks a Drive URL or token in the response", async () => {
    mocks.getPdfDocument.mockResolvedValue(DOC);
    mocks.downloadDriveFile.mockResolvedValue(new ArrayBuffer(0));
    const res = await call(ID);
    const headers = JSON.stringify([...res.headers.entries()]);
    expect(headers).not.toContain("googleapis");
    expect(headers).not.toContain("token-abc");
  });

  it("409s when the grant needs re-authorizing", async () => {
    mocks.getPdfDocument.mockResolvedValue(DOC);
    mocks.downloadDriveFile.mockRejectedValue(
      new DriveReauthorizationRequired("revoked"),
    );
    expect((await call(ID)).status).toBe(409);
  });

  it("410s a document whose file has left Drive, distinct from a bad id", async () => {
    mocks.getPdfDocument.mockResolvedValue(DOC);
    mocks.downloadDriveFile.mockRejectedValue(new DriveFileMissing("gone"));
    expect((await call(ID)).status).toBe(410);
  });

  it("502s any other Drive failure", async () => {
    mocks.getPdfDocument.mockResolvedValue(DOC);
    mocks.downloadDriveFile.mockRejectedValue(new Error("boom"));
    expect((await call(ID)).status).toBe(502);
  });
});
