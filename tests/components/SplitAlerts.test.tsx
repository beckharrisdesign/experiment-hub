import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import SplitAlerts from "@/app/pdf-metadata-viewer/SplitAlerts";

const scan = (n: number) => ({ id: `doc-${n}`, filename: `scan-${n}.pdf`, pageCount: 40 - n });
const many = (n: number) => Array.from({ length: n }, (_, i) => scan(i + 1));

describe("SplitAlerts (task 7j.6)", () => {
  it("is one link to the split page for each scan, with the list to come back to", () => {
    render(<SplitAlerts candidates={many(2)} listQuery="?q=scan" />);
    const links = screen.getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/pdf-metadata-viewer/id/doc-1/split?q=scan",
      "/pdf-metadata-viewer/id/doc-2/split?q=scan",
    ]);
    expect(links[0].textContent).toContain("39 pages scan-1.pdf");
    // Nothing else on the card to press, and no pictures.
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("shows five, and the rest when asked", () => {
    render(<SplitAlerts candidates={many(12)} listQuery="" />);
    expect(screen.getAllByRole("link")).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: "Show all 12" }));
    expect(screen.getAllByRole("link")).toHaveLength(12);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
