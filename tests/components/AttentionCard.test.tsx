import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

import { AttentionCard } from "@/app/pdf-metadata-viewer/AttentionCard";
import type { PdfDocument } from "@/lib/pdf-documents";

function doc(kind: "conflict" | "commit_failed" | "file_missing"): PdfDocument {
  return {
    id: "doc-1",
    filename: "05012025_Store Hours.pdf",
    attention: { kind, message: "Something happened.", at: new Date().toISOString() },
  } as unknown as PdfDocument;
}

describe("AttentionCard", () => {
  // A conflict is resolved in Compare. The whole card goes there, and nothing
  // in it leads to the document page instead.
  it("makes a conflict card one link, to Compare", () => {
    render(<AttentionCard document={doc("conflict")} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute("href")).toBe("/pdf-metadata-viewer/id/doc-1/compare");
    expect(links[0].textContent).toContain("05012025_Store Hours.pdf");
    expect(links[0].textContent).toContain("Something happened.");
  });

  it("never links the filename to the document page", () => {
    for (const kind of ["conflict", "commit_failed", "file_missing"] as const) {
      const { unmount } = render(<AttentionCard document={doc(kind)} />);
      for (const link of screen.queryAllByRole("link")) {
        expect(link.getAttribute("href")).not.toBe("/pdf-metadata-viewer/id/doc-1");
      }
      unmount();
    }
  });

  it("keeps Retry as its own button on a failed commit", () => {
    render(<AttentionCard document={doc("commit_failed")} />);
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
