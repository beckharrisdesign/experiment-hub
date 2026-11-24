import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));

import { SplitView, type PdfLoader } from "@/app/pdf-metadata-viewer/id/[id]/split/SplitView";

const sixPages: PdfLoader = async () => ({ numPages: 6, renderPage: async () => {} });

function renderView() {
  return render(
    <SplitView documentId="doc-1" filename="04272025_Scan.pdf" contentUrl="/c" loadPdf={sixPages} />,
  );
}

beforeEach(() => {
  push.mockClear();
  refresh.mockClear();
});
afterEach(() => vi.unstubAllGlobals());

describe("SplitView", () => {
  // Frame 69:132.
  it("starts with no breaks: one file, and Split can't be pressed", async () => {
    renderView();
    await screen.findByText("No breaks yet");
    expect(screen.getByText("One file · pages 1–6")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Choose where to split" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: "Clear breaks" })).toBeNull();
  });

  it("keeps its actions on screen while the pages load, and beside them anything that goes wrong", async () => {
    const never: PdfLoader = () => new Promise(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "Drive said no." }), { status: 502 })));
    render(<SplitView documentId="doc-1" filename="a.pdf" contentUrl="/c" loadPdf={never} />);
    expect(screen.getByText("Loading pages…")).toBeTruthy();
    const oneDocument = screen.getByRole("button", { name: "It's one document" });
    const bar = oneDocument.parentElement as HTMLElement;
    expect(bar.className).toContain("sticky bottom-0");
    fireEvent.click(oneDocument);
    expect(bar.contains(await screen.findByText(/Drive said no\./))).toBe(true);
  });

  // Frame 69:9.
  it("lists the files a split would create as gaps are chosen", async () => {
    renderView();
    fireEvent.click(await screen.findByRole("button", { name: "Split after page 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Split after page 5" }));
    expect(screen.getByText("Creates 3 files in the same Drive folder")).toBeTruthy();
    expect(screen.getByText("04272025_Scan-002.pdf")).toBeTruthy();
    expect(screen.getByText("File 2 · pages 3–5")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Split after page 2" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Split into 3 files" })).toBeTruthy();
  });

  it("clicking a chosen gap again removes it", async () => {
    renderView();
    const gap = await screen.findByRole("button", { name: "Split after page 2" });
    fireEvent.click(gap);
    fireEvent.click(gap);
    expect(screen.getByText("No breaks yet")).toBeTruthy();
  });

  it("posts the breaks in page order and goes to the archive", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true, outputs: ["a", "b", "c"] })));
    vi.stubGlobal("fetch", fetchMock);
    renderView();
    fireEvent.click(await screen.findByRole("button", { name: "Split after page 5" }));
    fireEvent.click(screen.getByRole("button", { name: "Split after page 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Split into 3 files" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/pdf-metadata-viewer"));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/pdf-documents/id/doc-1/split");
    expect(JSON.parse(init.body as string)).toEqual({ breaks: [2, 5] });
  });

  it("shows why a split was refused, and stays put", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "Not split: the file changed in Drive." }), { status: 409 })),
    );
    renderView();
    fireEvent.click(await screen.findByRole("button", { name: "Split after page 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Split into 2 files" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("the file changed in Drive"));
    expect(push).not.toHaveBeenCalled();
  });

  it("records 'It's one document' and goes back to the document", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true })));
    vi.stubGlobal("fetch", fetchMock);
    renderView();
    fireEvent.click(await screen.findByRole("button", { name: "It's one document" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/pdf-metadata-viewer/id/doc-1"));
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe("/api/pdf-documents/id/doc-1/split/not-needed");
  });
});
