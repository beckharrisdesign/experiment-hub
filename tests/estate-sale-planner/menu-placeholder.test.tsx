import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MenuPlaceholder from "@/app/estate-sale-planner/MenuPlaceholder";
import { track } from "@/lib/estate-sale-planner/analytics";

vi.mock("@/lib/estate-sale-planner/analytics", () => ({ track: vi.fn() }));

// jsdom has no showModal/close; stand in for the browser's <dialog>.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});
beforeEach(() => vi.mocked(track).mockClear());

const dialog = () => document.querySelector("dialog") as HTMLDialogElement;
const open = () =>
  fireEvent.click(screen.getByRole("button", { name: "Menu" }));

// ---------------------------------------------------------------------------
// esp-header-affordance · "The menu opens a placeholder and nothing else"
// ---------------------------------------------------------------------------

describe("MenuPlaceholder", () => {
  it("is a Menu button that says it opens a dialog", () => {
    render(<MenuPlaceholder />);
    const menu = screen.getByRole("button", { name: "Menu" });
    expect(menu.getAttribute("aria-haspopup")).toBe("dialog");
    expect(dialog().open).toBe(false);
  });

  it("opens an Account & profile panel holding only a Close button", () => {
    render(<MenuPlaceholder />);
    open();
    expect(dialog().open).toBe(true);
    expect(track).toHaveBeenCalledWith("esp_menu_open");
    expect(dialog().getAttribute("aria-labelledby")).toBeTruthy();
    expect(
      document.getElementById(dialog().getAttribute("aria-labelledby")!)
        ?.textContent,
    ).toBe("Account & profile");
    const inside = dialog().querySelectorAll(
      "button, a, input, select, textarea",
    );
    expect(inside.length).toBe(1);
    expect(inside[0].getAttribute("aria-label")).toBe("Close");
    expect(dialog().querySelectorAll("p").length).toBe(0);
  });

  it("closes from Close and returns focus to Menu", () => {
    render(<MenuPlaceholder />);
    open();
    fireEvent.click(
      screen.getByRole("button", { name: "Close", hidden: true }),
    );
    expect(dialog().open).toBe(false);
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Menu" }),
    );
  });

  it("closes when the backdrop (the dialog itself) is tapped, not the panel", () => {
    render(<MenuPlaceholder />);
    open();
    fireEvent.click(dialog().querySelector("h2")!);
    expect(dialog().open).toBe(true);
    fireEvent.click(dialog());
    expect(dialog().open).toBe(false);
  });
});
