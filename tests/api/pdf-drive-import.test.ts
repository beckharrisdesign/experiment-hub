import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getValidAccessToken: vi.fn(),
  getDriveFolder: vi.fn(),
  listPdfsInFolder: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/pdf-drive", async () => {
  const actual = await vi.importActual<typeof import("@/lib/pdf-drive")>("@/lib/pdf-drive");
  return {
    ...actual,
    getValidAccessToken: mocks.getValidAccessToken,
    getDriveFolder: mocks.getDriveFolder,
    listPdfsInFolder: mocks.listPdfsInFolder,
  };
});
vi.mock("@/lib/pdf-documents", () => ({
  getPdfAdminClient: () => ({ rpc: mocks.rpc }),
}));

import { POST } from "@/app/api/pdf-drive/import/route";
import { DriveFolderNotFound, DriveReauthorizationRequired } from "@/lib/pdf-drive";

const FILES = [
  { id: "file-1", name: "a.pdf", headRevisionId: "r1", snapshot: { name: "a.pdf" } },
  { id: "file-2", name: "b.pdf", headRevisionId: "r2", snapshot: { name: "b.pdf" } },
];

function post(body: string) {
  return POST(
    new NextRequest("http://localhost/api/pdf-drive/import", {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.getValidAccessToken.mockResolvedValue("token");
  mocks.getDriveFolder.mockResolvedValue({ id: "folder-1", name: "Scans" });
  mocks.listPdfsInFolder.mockResolvedValue(FILES);
  mocks.rpc.mockResolvedValue({ data: { inserted: 1, total: 2 }, error: null });
});

describe("POST /api/pdf-drive/import", () => {
  it("400s a body without a folder id", async () => {
    expect((await post("{}")).status).toBe(400);
    expect((await post("nope")).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("records the folder by Drive's own name and imports its PDFs in one call", async () => {
    const res = await post(JSON.stringify({ folderId: "folder-1" }));
    expect(res.status).toBe(200);
    expect(mocks.listPdfsInFolder).toHaveBeenCalledWith("token", "folder-1");
    expect(mocks.rpc).toHaveBeenCalledWith("pdf_import_folder", {
      folder_id: "folder-1",
      folder_name: "Scans",
      files: FILES,
    });
    expect(await res.json()).toMatchObject({
      success: true,
      folder: { id: "folder-1", name: "Scans" },
      imported: 2,
      added: 1,
      total: 2,
    });
  });

  it("records an empty folder too, so the dashboard shows it", async () => {
    mocks.listPdfsInFolder.mockResolvedValue([]);
    mocks.rpc.mockResolvedValue({ data: { inserted: 0, total: 0 }, error: null });
    const res = await post(JSON.stringify({ folderId: "folder-1" }));
    expect(res.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("pdf_import_folder", expect.objectContaining({ files: [] }));
  });

  it("404s an id that is not a folder, importing nothing", async () => {
    mocks.getDriveFolder.mockRejectedValue(new DriveFolderNotFound("That is not a folder"));
    const res = await post(JSON.stringify({ folderId: "file-1" }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("That is not a folder");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("409s when Drive access lapsed", async () => {
    mocks.getValidAccessToken.mockRejectedValue(new DriveReauthorizationRequired("revoked"));
    expect((await post(JSON.stringify({ folderId: "folder-1" }))).status).toBe(409);
  });

  it("502s when the folder cannot be listed", async () => {
    mocks.listPdfsInFolder.mockRejectedValue(new Error("Drive list failed (500)"));
    expect((await post(JSON.stringify({ folderId: "folder-1" }))).status).toBe(502);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("500s when the references cannot be stored", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect((await post(JSON.stringify({ folderId: "folder-1" }))).status).toBe(500);
  });
});
