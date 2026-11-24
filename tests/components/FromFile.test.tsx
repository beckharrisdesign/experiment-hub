import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

import { DetailsFromFile } from "@/app/pdf-metadata-viewer/id/[id]/FromFile";

const EMBEDDED = { title: "From the file", subject: null, author: null, keywords: ["heb"], pageCount: 3 };
const NONE = { fields: [], keywordsAdded: [], keywordsRemoved: [] };

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true, embedded: EMBEDDED })));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("DetailsFromFile", () => {
  it("shows the stored values read-only, then the file's once it answers", async () => {
    render(
      <DetailsFromFile
        documentId="doc-a"
        revision="r1"
        stored={{ title: null, subject: null, author: null, keywords: [] }}
        baselined={false}
        edited={NONE}
        pendingCount={0}
      />,
    );
    expect(screen.getByText("Reading the file from Drive…")).toBeTruthy();
    await waitFor(() => expect(screen.getByDisplayValue("From the file")).toBeTruthy());
    expect(screen.queryByText("Reading the file from Drive…")).toBeNull();
  });

  // A remount in the same view (an edit refreshes the page) reuses the read.
  it("reads the file once per revision, across remounts", async () => {
    const props = {
      documentId: "doc-b",
      revision: "r1",
      stored: { title: null, subject: null, author: null, keywords: [] },
      baselined: false,
      edited: NONE,
      pendingCount: 0,
    };
    const first = render(<DetailsFromFile {...props} />);
    await waitFor(() => expect(screen.getByDisplayValue("From the file")).toBeTruthy());
    first.unmount();
    render(<DetailsFromFile {...props} />);
    await waitFor(() => expect(screen.getByDisplayValue("From the file")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/pdf-documents/id/doc-b/file");
  });

  it("keeps the stored values and the editor disabled when the file can't be read", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: false, reason: "unreadable" })));
    render(
      <DetailsFromFile
        documentId="doc-c"
        revision="r1"
        stored={{ title: "Stored", subject: null, author: null, keywords: [] }}
        baselined={false}
        edited={NONE}
        pendingCount={0}
      />,
    );
    await waitFor(() => expect(screen.queryByText("Reading the file from Drive…")).toBeNull());
    expect((screen.getByRole("button", { name: /Suggest metadata/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
