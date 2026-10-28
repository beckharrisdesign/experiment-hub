import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Loading from "@/app/estate-sale-planner/Loading";

// ---------------------------------------------------------------------------
// A screen reading the device shows it's loading instead of a blank page
// (founder, 2026-10-28: "add in indicators that the items are loading").
// ---------------------------------------------------------------------------

describe("Loading", () => {
  it("is a polite status with a spoken label", () => {
    render(<Loading label="Loading your sale" />);
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(screen.getByText("Loading your sale")).toBeTruthy();
  });

  it("draws placeholder rows, quieted for reduced motion", () => {
    const { container } = render(<Loading label="Loading" rows={4} />);
    const rows = container.querySelectorAll("[data-testid=item-placeholder]");
    expect(rows.length).toBe(4);
    expect(container.innerHTML).toContain("motion-reduce:animate-none");
  });
});
