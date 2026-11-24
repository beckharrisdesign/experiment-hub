import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

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

  // Frame 89:760.
  it("can be split before any page arrives, when it's known how many there are (task 7j)", async () => {
    const never: PdfLoader = () => new Promise(() => {});
    render(<SplitView documentId="doc-1" filename="a.pdf" contentUrl="/c" loadPdf={never} knownPages={6} />);
    expect(screen.queryByText("Loading pages…")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Split after page 2" }));
    expect(screen.getByRole("button", { name: "Split into 2 files" })).toBeTruthy();
  });

  it("goes by the file's own count once it is here, and drops a break past its end", async () => {
    let arrive: (pdf: Awaited<ReturnType<PdfLoader>>) => void = () => {};
    const slow: PdfLoader = () => new Promise((resolve) => (arrive = resolve));
    render(<SplitView documentId="doc-1" filename="a.pdf" contentUrl="/c" loadPdf={slow} knownPages={6} />);
    fireEvent.click(screen.getByRole("button", { name: "Split after page 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Split after page 5" }));
    await act(async () => arrive({ numPages: 4, renderPage: async () => {} }));
    expect(screen.queryByRole("button", { name: "Split after page 5" })).toBeNull();
    expect(screen.getByRole("button", { name: "Split into 2 files" })).toBeTruthy();
  });

  it("offers no splitting when the pages can't be read, whatever was known", async () => {
    const broken: PdfLoader = async () => {
      throw new Error("no");
    };
    render(<SplitView documentId="doc-1" filename="a.pdf" contentUrl="/c" loadPdf={broken} knownPages={6} />);
    expect(await screen.findByText(/Couldn't load this PDF's pages/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Split after page 2" })).toBeNull();
    expect((screen.getByRole("button", { name: "Choose where to split" }) as HTMLButtonElement).disabled).toBe(true);
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
    expect(JSON.parse(init.body as string)).toEqual({
      breaks: [2, 5],
      parts: [
        { title: null, filename: "04272025_Scan-001.pdf" },
        { title: null, filename: "04272025_Scan-002.pdf" },
        { title: null, filename: "04272025_Scan-003.pdf" },
      ],
      copy: { subject: true, author: true, keywords: true },
    });
  });

  // Frame 83:24.
  describe("names and copies (task 7g)", () => {
    const tagged = { title: "Camp art", subject: "Summer camp", author: null, keywords: ["art", "school"] };
    async function renderSplit(values = tagged) {
      render(
        <SplitView documentId="doc-1" filename="04272025_Scan.pdf" contentUrl="/c" loadPdf={sixPages} values={values} />,
      );
      fireEvent.click(await screen.findByRole("button", { name: "Split after page 2" }));
      fireEvent.click(screen.getByRole("button", { name: "Split after page 5" }));
    }
    const titleOf = (n: number) => (screen.getByLabelText(`Title of file ${n}`) as HTMLInputElement).value;
    const checked = (name: string) => screen.getByRole("checkbox", { name }).getAttribute("aria-checked");

    it("starts from the scan's title, numbered, with files named to match", async () => {
      await renderSplit();
      expect([1, 2, 3].map(titleOf)).toEqual(["Camp art, 1 of 3", "Camp art, 2 of 3", "Camp art, 3 of 3"]);
      expect(screen.getByText("Camp art 2.pdf")).toBeTruthy();
      expect(checked("Number the parts")).toBe("true");
      expect(checked("Name the files after their titles")).toBe("true");
      expect(checked("Author")).toBe("false");
    });

    it("works the same for a scan not tagged yet: type a title and both choices turn on", async () => {
      await renderSplit({ title: null as unknown as string, subject: null as unknown as string, author: null, keywords: [] });
      expect(screen.getByText(/Nothing to copy: this scan has/)).toBeTruthy();
      expect(screen.getByText(/files keep the scan's name/)).toBeTruthy();
      expect(checked("Number the parts")).toBe("false");
      fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Camp art" } });
      expect(titleOf(3)).toBe("Camp art, 3 of 3");
      expect(checked("Number the parts")).toBe("true");
      expect(screen.getByText("Camp art 3.pdf")).toBeTruthy();
    });

    it("keeps an edited title through the choices and through another break", async () => {
      await renderSplit();
      fireEvent.change(screen.getByLabelText("Title of file 3"), { target: { value: "Clay fox" } });
      expect(screen.getByText("Clay fox.pdf")).toBeTruthy();
      fireEvent.click(screen.getByRole("checkbox", { name: "Number the parts" }));
      expect([1, 2, 3].map(titleOf)).toEqual(["Camp art", "Camp art", "Clay fox"]);
      fireEvent.click(screen.getByRole("button", { name: "Split after page 1" }));
      expect(titleOf(4)).toBe("Clay fox");
    });

    it("lets a title have spaces while it's being typed", async () => {
      await renderSplit();
      fireEvent.change(screen.getByLabelText("Title of file 1"), { target: { value: "Clay " } });
      expect(titleOf(1)).toBe("Clay ");
    });

    it("sends what it shows", async () => {
      const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true, outputs: [] })));
      vi.stubGlobal("fetch", fetchMock);
      await renderSplit();
      fireEvent.click(screen.getByRole("checkbox", { name: "Subject" }));
      fireEvent.change(screen.getByLabelText("Title of file 3"), { target: { value: "Clay fox" } });
      fireEvent.click(screen.getByRole("button", { name: "Split into 3 files" }));
      await waitFor(() => expect(push).toHaveBeenCalled());
      const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
      expect(body.parts).toEqual([
        { title: "Camp art, 1 of 3", filename: "Camp art 1.pdf" },
        { title: "Camp art, 2 of 3", filename: "Camp art 2.pdf" },
        { title: "Clay fox", filename: "Clay fox.pdf" },
      ]);
      expect(body.copy).toEqual({ subject: false, author: true, keywords: true });
    });
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

  it("records 'It's one document' and goes back to the list", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true })));
    vi.stubGlobal("fetch", fetchMock);
    renderView();
    fireEvent.click(await screen.findByRole("button", { name: "It's one document" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/pdf-metadata-viewer"));
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe("/api/pdf-documents/id/doc-1/split/not-needed");
  });
});
