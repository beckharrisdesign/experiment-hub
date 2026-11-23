import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@/lib/pdf-documents", () => ({
  getPdfAdminClient: vi.fn(),
}));

import {
  DriveFileMissing,
  DriveReauthorizationRequired,
  downloadDriveFile,
  DriveFolderNotFound,
  DriveWriteRefused,
  getDriveFolder,
  getDriveHeadRevisionId,
  getDriveRevision,
  uploadDriveFile,
} from "@/lib/pdf-drive";

function respond(status: number, body: BodyInit = "") {
  const fetchMock = vi.fn(async () => new Response(body, { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("downloadDriveFile", () => {
  it("fetches the file's media with the bearer token", async () => {
    const fetchMock = respond(200, "%PDF-1.7");
    const bytes = await downloadDriveFile("token-abc", "drive-123");

    expect(new TextDecoder().decode(bytes)).toBe("%PDF-1.7");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      "https://www.googleapis.com/drive/v3/files/drive-123?alt=media",
    );
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer token-abc",
    );
  });

  it("encodes the file id into the path", async () => {
    const fetchMock = respond(200, "x");
    await downloadDriveFile("t", "a/../b?alt=json");
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toContain("/files/a%2F..%2Fb%3Falt%3Djson?alt=media");
  });

  it("treats 401 as a grant that needs re-authorizing", async () => {
    respond(401);
    await expect(downloadDriveFile("t", "f")).rejects.toBeInstanceOf(
      DriveReauthorizationRequired,
    );
  });

  it("treats 403 as a grant that needs re-authorizing", async () => {
    respond(403);
    await expect(downloadDriveFile("t", "f")).rejects.toBeInstanceOf(
      DriveReauthorizationRequired,
    );
  });

  it("treats 404 as a missing file, not a revoked grant", async () => {
    respond(404);
    await expect(downloadDriveFile("t", "f")).rejects.toBeInstanceOf(
      DriveFileMissing,
    );
  });

  it("surfaces any other failure as a plain error", async () => {
    respond(500);
    const error = await downloadDriveFile("t", "f").catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(DriveReauthorizationRequired);
    expect(error).not.toBeInstanceOf(DriveFileMissing);
  });
});

describe("getDriveHeadRevisionId", () => {
  it("asks for the head revision and trash state only, not the bytes", async () => {
    const fetchMock = respond(200, JSON.stringify({ headRevisionId: "rev-7", trashed: false }));
    await expect(getDriveHeadRevisionId("t", "drive-123")).resolves.toBe("rev-7");
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toBe(
      "https://www.googleapis.com/drive/v3/files/drive-123?fields=headRevisionId,trashed",
    );
  });

  // Drive still serves a trashed file and still accepts writes to it, so a
  // commit would land in the trash and report success. Moving a file to the
  // trash is how people throw it away: it counts as gone.
  it("treats a trashed file as missing", async () => {
    respond(200, JSON.stringify({ headRevisionId: "rev-7", trashed: true }));
    await expect(getDriveHeadRevisionId("t", "drive-123")).rejects.toBeInstanceOf(
      DriveFileMissing,
    );
  });

  it("returns null when Drive reports no revision", async () => {
    respond(200, "{}");
    await expect(getDriveHeadRevisionId("t", "drive-123")).resolves.toBeNull();
  });

  it("maps refusals the same way as a download", async () => {
    respond(404);
    await expect(getDriveHeadRevisionId("t", "x")).rejects.toBeInstanceOf(DriveFileMissing);
    respond(401);
    await expect(getDriveHeadRevisionId("t", "x")).rejects.toBeInstanceOf(
      DriveReauthorizationRequired,
    );
  });
});

describe("getDriveRevision", () => {
  it("asks for the revision, modified time and trash state", async () => {
    const fetchMock = respond(
      200,
      JSON.stringify({ headRevisionId: "rev-7", modifiedTime: "2026-11-23T17:38:52Z", trashed: false }),
    );
    await expect(getDriveRevision("t", "drive-123")).resolves.toEqual({
      revision: "rev-7",
      modifiedTime: "2026-11-23T17:38:52Z",
    });
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toBe(
      "https://www.googleapis.com/drive/v3/files/drive-123?fields=headRevisionId,modifiedTime,trashed",
    );
  });

  it("treats a trashed file as missing", async () => {
    respond(200, JSON.stringify({ headRevisionId: "rev-7", trashed: true }));
    await expect(getDriveRevision("t", "drive-123")).rejects.toBeInstanceOf(DriveFileMissing);
  });
});

describe("uploadDriveFile", () => {
  function session(putStatus = 200, putBody = JSON.stringify({ headRevisionId: "rev-9" })) {
    const fetchMock = vi.fn(async (url: string) =>
      url.startsWith("https://www.googleapis.com/upload/")
        ? new Response("", { status: 200, headers: { Location: "https://upload.example/session-1" } })
        : new Response(putBody, { status: putStatus }),
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("updates the same file id through a resumable session and returns the new revision", async () => {
    const fetchMock = session();
    const bytes = new Uint8Array([37, 80, 68, 70]);
    await expect(uploadDriveFile("token-abc", "drive-123", bytes)).resolves.toBe("rev-9");

    const [startUrl, startInit] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(startUrl).toBe(
      "https://www.googleapis.com/upload/drive/v3/files/drive-123?uploadType=resumable&fields=headRevisionId",
    );
    expect(startInit.method).toBe("PATCH");
    const headers = startInit.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer token-abc");
    expect(headers["X-Upload-Content-Type"]).toBe("application/pdf");
    expect(headers["X-Upload-Content-Length"]).toBe("4");

    const [putUrl, putInit] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(putUrl).toBe("https://upload.example/session-1");
    expect(putInit.method).toBe("PUT");
    expect(putInit.body).toBe(bytes);
  });

  it("reports a 403 as a refused write, not a lapsed grant", async () => {
    respond(403);
    await expect(uploadDriveFile("t", "x", new Uint8Array(1))).rejects.toBeInstanceOf(
      DriveWriteRefused,
    );
  });

  it("reports a 401 as a lapsed grant", async () => {
    respond(401);
    await expect(uploadDriveFile("t", "x", new Uint8Array(1))).rejects.toBeInstanceOf(
      DriveReauthorizationRequired,
    );
  });

  it("fails when the upload itself is refused", async () => {
    session(500, "");
    await expect(uploadDriveFile("t", "x", new Uint8Array(1))).rejects.toThrow(/upload the file \(500\)/);
  });

  it("fails when Drive opens no upload session", async () => {
    respond(200);
    await expect(uploadDriveFile("t", "x", new Uint8Array(1))).rejects.toThrow(/upload session/);
  });
});

describe("getDriveFolder", () => {
  it("returns the folder's id and name as Drive reports them", async () => {
    const fetchMock = respond(
      200,
      JSON.stringify({ id: "f-1", name: "Scans", mimeType: "application/vnd.google-apps.folder" }),
    );
    await expect(getDriveFolder("t", "f-1")).resolves.toEqual({ id: "f-1", name: "Scans" });
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toBe("https://www.googleapis.com/drive/v3/files/f-1?fields=id,name,mimeType");
  });

  it("refuses an id that is a file, not a folder", async () => {
    respond(200, JSON.stringify({ id: "x", name: "a.pdf", mimeType: "application/pdf" }));
    await expect(getDriveFolder("t", "x")).rejects.toBeInstanceOf(DriveFolderNotFound);
  });

  it("reports a missing folder as not found", async () => {
    respond(404);
    await expect(getDriveFolder("t", "x")).rejects.toBeInstanceOf(DriveFolderNotFound);
  });
});
