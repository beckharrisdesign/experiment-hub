import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PagePreview } from "@/app/pdf-metadata-viewer/id/[id]/PagePreview";
import type { LoadedPdf } from "@/app/pdf-metadata-viewer/pdfjs";

/** A stub pdf whose pages finish drawing only when the test says so. */
function stubPdf(numPages: number, fail: number[] = []) {
  const pending: Array<{ page: number; done: () => void; failIt: () => void }> = [];
  const order: number[] = [];
  const pdf: LoadedPdf = {
    numPages,
    renderPage: (page) =>
      new Promise<void>((resolve, reject) => {
        order.push(page);
        pending.push({ page, done: resolve, failIt: () => reject(new Error("bad page")) });
      }),
    pageSize: async () => ({ width: 612, height: 792 }),
    destroy: vi.fn(),
  };
  const finish = (page: number) => {
    const p = pending.find((x) => x.page === page)!;
    if (fail.includes(page)) p.failIt();
    else p.done();
  };
  return { pdf, order, finish };
}

const base = {
  documentId: "doc-1",
  contentUrl: "/api/pdf-documents/id/doc-1/content",
  filename: "Invoice.pdf",
  storedPageCount: null,
  wasSplit: false,
  frameClass: "h-[420px]",
};

/** jsdom lays nothing out: pages 700 tall in a 600-tall box, 16 apart. */
const PAGE = 716;
const realLayout = Object.fromEntries(
  (["clientHeight", "offsetTop", "offsetHeight"] as const).map((k) => [
    k,
    Object.getOwnPropertyDescriptor(k === "clientHeight" ? Element.prototype : HTMLElement.prototype, k)!,
  ]),
);
beforeEach(() => {
  const define = (k: string, get: (this: HTMLElement) => number) =>
    Object.defineProperty(HTMLElement.prototype, k, { configurable: true, get });
  define("clientHeight", function () {
    return this.getAttribute("aria-label") === "Pages" ? 600 : 0;
  });
  define("offsetHeight", function () {
    return this.tagName === "LI" ? 700 : 0;
  });
  define("offsetTop", function () {
    return this.tagName === "LI" ? [...this.parentElement!.children].indexOf(this) * PAGE : 0;
  });
});
afterEach(() => {
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientHeight;
  Object.defineProperty(HTMLElement.prototype, "offsetTop", realLayout.offsetTop);
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", realLayout.offsetHeight);
});
function scrollToPage(n: number) {
  const box = screen.getByLabelText("Pages");
  box.scrollTop = (n - 1) * PAGE;
  fireEvent.scroll(box);
}

describe("PagePreview", () => {
  it("says it's loading until the file has arrived", () => {
    render(<PagePreview {...base} loadPdf={() => new Promise(() => {})} />);
    expect(screen.getByText("Loading pages…")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open full size" }).getAttribute("href")).toBe(base.contentUrl);
  });

  // Task 7f.5: thirty pages were sent to show two.
  it("draws only the pages near the screen, first page first, holding the others' places", async () => {
    const { pdf, order, finish } = stubPdf(30);
    render(<PagePreview {...base} loadPdf={async () => pdf} />);
    await waitFor(() => expect(order).toEqual([1, 2]));
    finish(1);
    finish(2);
    await screen.findByText("Drawing page 3…");
    await waitFor(() => expect(screen.queryByText(/Drawing page [12]…/)).toBeNull());
    expect(order).toEqual([1, 2]);
    expect(screen.getByText("Drawing page 3…")).toBeTruthy();
    expect(screen.getAllByRole("img")).toHaveLength(30);
    expect(screen.getByText("Page 1 of 30")).toBeTruthy();
  });

  it("draws the page scrolled to before the ones on the way", async () => {
    const { pdf, order, finish } = stubPdf(30);
    render(<PagePreview {...base} loadPdf={async () => pdf} />);
    await waitFor(() => expect(order).toEqual([1, 2]));
    scrollToPage(20);
    await waitFor(() => expect(order.slice(2).sort()).toEqual([19, 20]));
    expect(screen.getByText("Page 20 of 30")).toBeTruthy();
    finish(20);
    finish(19);
    await waitFor(() => expect(order.slice(4)).toEqual([21]));
    expect(order).not.toContain(10);
  });

  it("shows a page's small copy until the page itself is drawn", async () => {
    const { pdf, finish } = stubPdf(3);
    const previewPage = vi.fn(async (n: number) => {
      if (n !== 1) throw new Error("No small copy");
    });
    pdf.previewPage = previewPage;
    const { container } = render(<PagePreview {...base} loadPdf={async () => pdf} />);
    await screen.findByText("Drawing page 2…");
    await waitFor(() => expect(screen.queryByText("Drawing page 1…")).toBeNull());
    const [page, small] = [...container.querySelectorAll("li")[0].querySelectorAll("canvas")];
    expect(small.className).not.toContain("hidden");
    expect(page.className).toContain("hidden");
    // None kept for page 2, and page 3 isn't near enough to ask.
    expect(screen.getByText("Drawing page 2…")).toBeTruthy();
    expect(previewPage.mock.calls.map(([n]) => n)).toEqual([1, 2]);
    finish(1);
    await waitFor(() => expect(page.className).not.toContain("hidden"));
    expect(small.className).toContain("hidden");
  });

  it("goes on to the next page when one can't be drawn", async () => {
    const { pdf, order, finish } = stubPdf(2, [1]);
    render(<PagePreview {...base} loadPdf={async () => pdf} />);
    await waitFor(() => expect(order).toEqual([1, 2]));
    finish(1);
    await waitFor(() => expect(screen.getByText("Couldn't draw page 1")).toBeTruthy());
    finish(2);
    await waitFor(() => expect(screen.queryByText("Drawing page 2…")).toBeNull());
  });

  it("shows the page count and offers Split for a multi-page file", async () => {
    const { pdf } = stubPdf(3);
    render(<PagePreview {...base} loadPdf={async () => pdf} />);
    await waitFor(() => expect(screen.getByText("Page 1 of 3")).toBeTruthy());
    expect(screen.getByRole("link", { name: "Split pages" }).getAttribute("href")).toBe(
      "/pdf-metadata-viewer/id/doc-1/split",
    );
  });

  it("offers Split from the stored count before the file arrives", () => {
    render(<PagePreview {...base} storedPageCount={2} loadPdf={() => new Promise(() => {})} />);
    expect(screen.getByRole("link", { name: "Split pages" })).toBeTruthy();
  });

  it("points a split original at its parts instead", async () => {
    const { pdf } = stubPdf(3);
    render(<PagePreview {...base} wasSplit loadPdf={async () => pdf} />);
    await waitFor(() => expect(screen.getByRole("link", { name: "Split into parts — see them" })).toBeTruthy());
    expect(screen.queryByRole("link", { name: "Split pages" })).toBeNull();
  });

  it("offers no Split for a one-page file", async () => {
    const { pdf } = stubPdf(1);
    render(<PagePreview {...base} loadPdf={async () => pdf} />);
    await waitFor(() => expect(screen.getByText("Page 1 of 1")).toBeTruthy());
    expect(screen.queryByRole("link", { name: /Split/ })).toBeNull();
  });

  it("says so when the file can't be read, and still offers full size", async () => {
    render(<PagePreview {...base} loadPdf={async () => Promise.reject(new Error("x"))} />);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Open it full size instead"));
    expect(screen.getByRole("link", { name: "Open full size" })).toBeTruthy();
  });

  it("lets go of the pdf when it leaves the page", async () => {
    const { pdf } = stubPdf(1);
    const view = render(<PagePreview {...base} loadPdf={async () => pdf} />);
    await waitFor(() => expect(screen.getByText("Page 1 of 1")).toBeTruthy());
    view.unmount();
    expect(pdf.destroy).toHaveBeenCalled();
  });
});
