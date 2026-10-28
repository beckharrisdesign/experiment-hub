import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TopBar from "@/app/estate-sale-planner/TopBar";
import { chromeFor, parseRoute } from "@/lib/estate-sale-planner/routes";

vi.mock("@/lib/estate-sale-planner/analytics", () => ({ track: vi.fn() }));

const at = (path: string, sale = "Mom's house", item = "Teak sideboard") =>
  chromeFor(parseRoute(path), sale, item);
const back = () => screen.queryByRole("link", { name: /^Back to / });

// ---------------------------------------------------------------------------
// esp-header-affordance · esp-app-header spec (option A: one Back button, then the title)
// ---------------------------------------------------------------------------

describe("TopBar · the way back is a button", () => {
  it("Back from a sale's inner screens goes to the sale's Items screen", () => {
    for (const screenPath of ["sort", "progress", "capture", "items/item_1"]) {
      const { unmount } = render(
        <TopBar chrome={at(`/estate-sale-planner/sales/s1/${screenPath}`)} />,
      );
      expect(back()?.getAttribute("href")).toBe(
        "/estate-sale-planner/sales/s1",
      );
      expect(back()?.textContent).toContain("Mom's house");
      unmount();
    }
  });

  it("Back from a sale to Home", () => {
    for (const path of [
      "/estate-sale-planner/sales/s1",
      "/estate-sale-planner/new",
    ]) {
      const { unmount } = render(<TopBar chrome={at(path)} />);
      expect(back()?.getAttribute("aria-label")).toBe("Back to Home");
      expect(back()?.getAttribute("href")).toBe("/estate-sale-planner");
      unmount();
    }
  });

  it("Back from a source photo returns to the item", () => {
    render(
      <TopBar
        chrome={at("/estate-sale-planner/sales/s1/items/item_1/photo")}
      />,
    );
    expect(back()?.getAttribute("href")).toBe(
      "/estate-sale-planner/sales/s1/items/item_1",
    );
    expect(back()?.textContent).toContain("Teak sideboard");
  });

  it("Home has no Back button", () => {
    render(<TopBar chrome={at("/estate-sale-planner")} />);
    expect(back()).toBeNull();
  });

  it("is a button with a container, not a trail: only the parent shows", () => {
    render(<TopBar chrome={at("/estate-sale-planner/sales/s1/sort")} />);
    expect(back()?.getAttribute("data-slot")).toBe("button");
    expect(screen.queryByRole("link", { name: "Home" })).toBeNull();
  });
});

describe("TopBar · title and menu", () => {
  it("shows the current page's name, single-line, marked current", () => {
    render(<TopBar chrome={at("/estate-sale-planner/sales/s1/sort")} />);
    const title = screen.getByText("Sort");
    expect(title.getAttribute("aria-current")).toBe("page");
    expect(title.className).toContain("truncate");
  });

  it("a long name truncates while Back and Menu stay put", () => {
    render(
      <TopBar
        chrome={at(
          "/estate-sale-planner/sales/s1/items/i",
          "Grandma Ruth's lake house on Larchmont Avenue",
          "Hand-carved walnut secretary desk",
        )}
      />,
    );
    expect(back()?.className).toContain("min-w-0");
    expect(screen.getByRole("button", { name: "Menu" }).className).toContain(
      "shrink-0",
    );
  });

  it("Menu on every page", () => {
    for (const path of [
      "/estate-sale-planner",
      "/estate-sale-planner/sales/s1",
      "/estate-sale-planner/sales/s1/items/i",
      "/estate-sale-planner/summary",
    ]) {
      const { unmount } = render(<TopBar chrome={at(path)} />);
      expect(screen.getByRole("button", { name: "Menu" })).toBeTruthy();
      unmount();
    }
  });

  it("Item screen keeps its toggle under the row, with room for both", () => {
    const { container } = render(
      <TopBar chrome={at("/estate-sale-planner/sales/s1/items/i")}>
        <div role="radiogroup" aria-label="Where is this headed?" />
      </TopBar>,
    );
    expect(screen.getByRole("radiogroup")).toBeTruthy();
    const chrome = container.querySelector("[data-slot=chrome]") as HTMLElement;
    expect(chrome.style.getPropertyValue("--chrome-top-height")).toBe(
      "7.75rem",
    );
  });

  it("without a toggle the header is one 60 px row", () => {
    const { container } = render(
      <TopBar chrome={at("/estate-sale-planner/sales/s1/sort")} />,
    );
    const chrome = container.querySelector("[data-slot=chrome]") as HTMLElement;
    expect(chrome.style.getPropertyValue("--chrome-top-height")).toBe(
      "3.75rem",
    );
  });
});
