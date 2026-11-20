import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@/lib/pdf-documents", () => ({
  getPdfAdminClient: vi.fn(),
}));

import {
  DriveFileMissing,
  DriveReauthorizationRequired,
  downloadDriveFile,
  getDriveHeadRevisionId,
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
  it("asks for the head revision only, not the bytes", async () => {
    const fetchMock = respond(200, JSON.stringify({ headRevisionId: "rev-7" }));
    await expect(getDriveHeadRevisionId("t", "drive-123")).resolves.toBe("rev-7");
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toBe(
      "https://www.googleapis.com/drive/v3/files/drive-123?fields=headRevisionId",
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
