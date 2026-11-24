import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

describe("PagePreview", () => {
  it("says it's loading until the file has arrived", () => {
    render(<PagePreview {...base} loadPdf={() => new Promise(() => {})} />);
    expect(screen.getByText("Loading pages…")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open full size" }).getAttribute("href")).toBe(base.contentUrl);
  });

  it("draws pages one after another, first page first, holding each place until drawn", async () => {
    const { pdf, order, finish } = stubPdf(3);
    render(<PagePreview {...base} loadPdf={async () => pdf} />);
    await waitFor(() => expect(order).toEqual([1]));
    expect(screen.getByText("Drawing page 2…")).toBeTruthy();
    expect(screen.getByText("Drawing page 3…")).toBeTruthy();
    finish(1);
    await waitFor(() => expect(order).toEqual([1, 2]));
    finish(2);
    await waitFor(() => expect(order).toEqual([1, 2, 3]));
    finish(3);
    await waitFor(() => expect(screen.queryByText(/Drawing page/)).toBeNull());
    expect(screen.getAllByRole("img").map((c) => c.getAttribute("aria-label"))).toEqual([
      "Page 1 of Invoice.pdf",
      "Page 2 of Invoice.pdf",
      "Page 3 of Invoice.pdf",
    ]);
  });

  it("goes on to the next page when one can't be drawn", async () => {
    const { pdf, order, finish } = stubPdf(2, [1]);
    render(<PagePreview {...base} loadPdf={async () => pdf} />);
    await waitFor(() => expect(order).toEqual([1]));
    finish(1);
    await waitFor(() => expect(order).toEqual([1, 2]));
    expect(screen.getByText("Couldn't draw page 1")).toBeTruthy();
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
