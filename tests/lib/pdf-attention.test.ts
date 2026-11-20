import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ update: vi.fn(), eq: vi.fn(), not: vi.fn() }));

vi.mock("@/lib/pdf-documents", () => ({
  getPdfAdminClient: () => ({ from: () => ({ update: mocks.update }) }),
}));

import { attentionFor, clearAttention, recordAttention } from "@/lib/pdf-attention";
import { DriveFileMissing, DriveReauthorizationRequired, DriveWriteRefused } from "@/lib/pdf-drive";
import { PdfNotWritable } from "@/lib/pdf-embedded";

function named(name: string) {
  const e = new Error(name);
  e.name = name;
  return e;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.not.mockResolvedValue({ error: null });
  mocks.eq.mockImplementation(() => Object.assign(Promise.resolve({ error: null }), { not: mocks.not }));
  mocks.update.mockReturnValue({ eq: mocks.eq });
});

describe("attentionFor (design.md D4 instance types)", () => {
  it("makes a conflict an instance that says the edits are safe", () => {
    expect(attentionFor(named("CommitConflict"))).toMatchObject({ kind: "conflict" });
    expect(attentionFor(named("CommitConflict"))?.message).toMatch(/safe/);
  });

  it("makes a missing file its own kind", () => {
    expect(attentionFor(new DriveFileMissing("gone"))).toMatchObject({ kind: "file_missing" });
  });

  it("makes refused and failed writes a failed commit that lost nothing", () => {
    for (const error of [new DriveWriteRefused("403"), new PdfNotWritable("This PDF is encrypted"), new Error("socket")]) {
      const a = attentionFor(error);
      expect(a?.kind).toBe("commit_failed");
      expect(a?.message).toMatch(/Nothing was lost|record/);
    }
  });

  it("does not file a lapsed sign-in against one document", () => {
    expect(attentionFor(new DriveReauthorizationRequired("revoked"))).toBeNull();
  });
});

describe("recordAttention / clearAttention", () => {
  it("writes the instance onto the one document, by id", async () => {
    await recordAttention("doc-1", new DriveFileMissing("gone"));
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ attention_kind: "file_missing", attention_at: expect.any(String) }),
    );
    expect(mocks.eq).toHaveBeenCalledWith("id", "doc-1");
  });

  it("writes nothing for a failure that is not about the document", async () => {
    await recordAttention("doc-1", new DriveReauthorizationRequired("revoked"));
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("never throws over the error it is recording", async () => {
    mocks.update.mockImplementation(() => {
      throw new Error("db down");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(recordAttention("doc-1", new Error("x"))).resolves.toBeUndefined();
  });

  it("clears all three fields on the document", async () => {
    await clearAttention("doc-1");
    expect(mocks.update).toHaveBeenCalledWith({ attention_kind: null, attention_message: null, attention_at: null });
    expect(mocks.eq).toHaveBeenCalledWith("id", "doc-1");
  });
});
