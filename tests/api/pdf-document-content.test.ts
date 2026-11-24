import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getPdfDocument: vi.fn(),
  getValidAccessToken: vi.fn(),
  openDriveFile: vi.fn(),
  getDriveHeadRevisionId: vi.fn(),
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
    openDriveFile: mocks.openDriveFile,
    getDriveHeadRevisionId: mocks.getDriveHeadRevisionId,
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

function call(id: string, headers: Record<string, string> = {}) {
  return GET(new NextRequest(`http://localhost/api/pdf-documents/id/${id}/content`, { headers }), {
    params: Promise.resolve({ id }),
  });
}

beforeEach(() => {
  for (const m of Object.values(mocks)) m.mockReset();
  mocks.getValidAccessToken.mockResolvedValue("token-abc");
  mocks.getDriveHeadRevisionId.mockResolvedValue("rev-1");
});

describe("GET /api/pdf-documents/id/[id]/content", () => {
  it("404s a malformed id without touching the store or Drive", async () => {
    const res = await call("not-a-uuid");
    expect(res.status).toBe(404);
    expect(mocks.getPdfDocument).not.toHaveBeenCalled();
    expect(mocks.openDriveFile).not.toHaveBeenCalled();
  });

  it("404s an unknown document without touching Drive", async () => {
    mocks.getPdfDocument.mockResolvedValue(null);
    const res = await call(ID);
    expect(res.status).toBe(404);
    expect(mocks.openDriveFile).not.toHaveBeenCalled();
  });

  it("streams the bytes inline as a PDF that no cache keeps", async () => {
    mocks.getPdfDocument.mockResolvedValue(DOC);
    mocks.openDriveFile.mockResolvedValue(
      new Response("%PDF-1.7", { headers: { "content-length": "8" } }),
    );

    const res = await call(ID);

    expect(res.status).toBe(200);
    expect(mocks.openDriveFile).toHaveBeenCalledWith("token-abc", "drive-abc", undefined);
    expect(res.headers.get("content-length")).toBe("8");
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("content-disposition")).toBe(
      `inline; filename*=UTF-8''${encodeURIComponent(DOC.filename)}`,
    );
    expect(await res.text()).toBe("%PDF-1.7");
  });

  // Task 7c.3: the preview fetches a large scan in byte ranges.
  it("passes one byte range to Drive and answers with just those bytes", async () => {
    mocks.getPdfDocument.mockResolvedValue(DOC);
    mocks.openDriveFile.mockResolvedValue(
      new Response("%PDF", {
        status: 206,
        headers: { "content-range": "bytes 0-3/9807226", "content-length": "4" },
      }),
    );
    const res = await call(ID, { range: "bytes=0-3" });
    expect(mocks.openDriveFile).toHaveBeenCalledWith("token-abc", "drive-abc", "bytes=0-3");
    expect(res.status).toBe(206);
    expect(res.headers.get("content-range")).toBe("bytes 0-3/9807226");
    expect(res.headers.get("accept-ranges")).toBe("bytes");
    expect(await res.text()).toBe("%PDF");
  });

  it("sends the whole file for a range it doesn't take", async () => {
    mocks.getPdfDocument.mockResolvedValue(DOC);
    mocks.openDriveFile.mockResolvedValue(new Response("%PDF-1.7"));
    const res = await call(ID, { range: "bytes=0-3,10-20" });
    expect(mocks.openDriveFile).toHaveBeenCalledWith("token-abc", "drive-abc", undefined);
    expect(res.status).toBe(200);
    expect(res.headers.get("accept-ranges")).toBe("bytes");
  });

  // 7c.3: where a preview request's time goes.
  it("says where the time went, step by step", async () => {
    mocks.getPdfDocument.mockResolvedValue(DOC);
    mocks.openDriveFile.mockResolvedValue(new Response("%PDF-1.7"));
    const res = await call(ID);
    const timing = res.headers.get("server-timing") ?? "";
    for (const step of ["doc;dur=", "token;dur=", "revision;dur=", "drive-headers;dur=", "region;desc="]) {
      expect(timing).toContain(step);
    }
    expect(await res.text()).toBe("%PDF-1.7");
  });

  it("times Drive alone when asked to read the whole file first", async () => {
    mocks.getPdfDocument.mockResolvedValue(DOC);
    mocks.openDriveFile.mockResolvedValue(new Response("%PDF-1.7"));
    const res = await GET(
      new NextRequest(`http://localhost/api/pdf-documents/id/${ID}/content?timing=buffer`),
      { params: Promise.resolve({ id: ID }) },
    );
    expect(res.headers.get("server-timing")).toMatch(/drive-body;dur=\d+;desc="8 bytes"/);
    expect(await res.text()).toBe("%PDF-1.7");
  });

  it("never leaks a Drive URL or token in the response", async () => {
    mocks.getPdfDocument.mockResolvedValue(DOC);
    mocks.openDriveFile.mockResolvedValue(new Response(""));
    const res = await call(ID);
    const headers = JSON.stringify([...res.headers.entries()]);
    expect(headers).not.toContain("googleapis");
    expect(headers).not.toContain("token-abc");
  });

  it("409s when the grant needs re-authorizing", async () => {
    mocks.getPdfDocument.mockResolvedValue(DOC);
    mocks.openDriveFile.mockRejectedValue(
      new DriveReauthorizationRequired("revoked"),
    );
    expect((await call(ID)).status).toBe(409);
  });

  it("410s a document whose file has left Drive, distinct from a bad id", async () => {
    mocks.getPdfDocument.mockResolvedValue(DOC);
    mocks.openDriveFile.mockRejectedValue(new DriveFileMissing("gone"));
    expect((await call(ID)).status).toBe(410);
  });

  // A trashed file is still downloadable; the revision read is what says it
  // is gone. The download runs alongside it, so it is cancelled unsent.
  it("410s a trashed file and sends none of its bytes", async () => {
    mocks.getPdfDocument.mockResolvedValue(DOC);
    mocks.getDriveHeadRevisionId.mockRejectedValue(new DriveFileMissing("trashed"));
    const cancel = vi.fn(async () => {});
    mocks.openDriveFile.mockResolvedValue(new Response(new ReadableStream({ cancel })));
    const res = await call(ID);
    expect(res.status).toBe(410);
    expect(await res.text()).not.toContain("%PDF");
    expect(cancel).toHaveBeenCalled();
  });

  it("502s any other Drive failure", async () => {
    mocks.getPdfDocument.mockResolvedValue(DOC);
    mocks.openDriveFile.mockRejectedValue(new Error("boom"));
    expect((await call(ID)).status).toBe(502);
  });
});
