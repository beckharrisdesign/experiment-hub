import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

import { DetailsFromFile, PreviewFooter } from "@/app/pdf-metadata-viewer/id/[id]/FromFile";

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

  // The panel and the page count share one read: the file downloads once.
  it("reads the file once for the panel and the page count together", async () => {
    render(
      <>
        <PreviewFooter documentId="doc-b" revision="r1" storedPageCount={null} wasSplit={false} contentUrl="/c" />
        <DetailsFromFile
          documentId="doc-b"
          revision="r1"
          stored={{ title: null, subject: null, author: null, keywords: [] }}
          baselined={false}
          edited={NONE}
          pendingCount={0}
        />
      </>,
    );
    await waitFor(() => expect(screen.getByText("3 pages")).toBeTruthy());
    expect(screen.getByRole("link", { name: "Split pages" })).toBeTruthy();
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

describe("PreviewFooter", () => {
  it("uses the stored page count without reading the file", () => {
    render(<PreviewFooter documentId="doc-d" revision="r1" storedPageCount={1} wasSplit={false} contentUrl="/c" />);
    expect(screen.getByText("1 page")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Split pages" })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
