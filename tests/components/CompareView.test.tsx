import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

import { CompareView } from "@/app/pdf-metadata-viewer/id/[id]/compare/CompareView";
import type { FieldComparison } from "@/lib/pdf-conflict";

const FIELDS: FieldComparison[] = [
  { field: "title", state: "conflict", was: "HEB Receipt", yours: "Groceries", inDrive: "Changed in Drive" },
  { field: "subject", state: "unchanged", was: null, yours: null, inDrive: null },
  { field: "author", state: "unchanged", was: null, yours: null, inDrive: null },
  { field: "keywords", state: "unchanged", was: ["HEB"], yours: ["HEB"], inDrive: ["HEB"] },
] as FieldComparison[];

function renderCompare() {
  return render(
    <CompareView
      documentId="doc-1"
      fields={FIELDS}
      pages={null}
      seenRevision="rev-2"
      contentUrl="/api/pdf-documents/id/doc-1/content"
    />,
  );
}

/** What a choice cell lays out: its text and every child box, visible or not. */
function shape(button: HTMLElement) {
  return [...button.childNodes].map((n) =>
    n.nodeType === Node.TEXT_NODE ? `text:${n.textContent}` : `${(n as HTMLElement).tagName}`,
  );
}

describe("CompareView choosing a value", () => {
  // Choosing must not resize anything: the check mark's slot is there before
  // it is chosen (just invisible), so the cell's content width never changes.
  it("keeps the same boxes in a choice cell before and after it is chosen", () => {
    renderCompare();
    const drive = screen.getByRole("button", { name: /Use Drive's Title/ });
    const before = shape(drive);
    const check = drive.querySelector("[aria-hidden]") as HTMLElement;
    expect(check).not.toBeNull();
    expect(check.className).toContain("invisible");

    fireEvent.click(drive);

    expect(drive.getAttribute("aria-pressed")).toBe("true");
    expect(shape(drive)).toEqual(before);
    expect((drive.querySelector("[aria-hidden]") as HTMLElement).className).not.toContain("invisible");
  });

  it("puts the check after the value, never before it", () => {
    renderCompare();
    const yours = screen.getByRole("button", { name: /Use your Title/ });
    expect(yours.firstElementChild?.textContent).toBe("Groceries");
  });

  // Auto table layout sizes columns from their content, so "Needs decision"
  // becoming "Decided" (or any longer value) would shift every column.
  it("fixes the column widths so a change in one cell moves nothing else", () => {
    const { container } = renderCompare();
    const table = container.querySelector("table") as HTMLTableElement;
    expect(table.className).toContain("table-fixed");
    expect(table.querySelectorAll("colgroup col")).toHaveLength(5);
  });
});
