import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DestinationToggle from "@/app/estate-sale-planner/DestinationToggle";

describe("DestinationToggle · segmented (sold-comps D16)", () => {
  it("is one radio group of Sell, Donate, Keep with exactly the current one checked", () => {
    render(<DestinationToggle variant="segmented" value="donate" onChange={() => {}} />);
    const group = screen.getByRole("radiogroup");
    const radios = screen.getAllByRole("radio");
    expect(group).toBeTruthy();
    expect(radios.map((r) => r.textContent)).toEqual(["Sell", "Donate", "Keep"]);
    expect(radios.map((r) => r.getAttribute("aria-checked"))).toEqual(["false", "true", "false"]);
  });

  it("selects on click", () => {
    const onChange = vi.fn();
    render(<DestinationToggle variant="segmented" value="sell" onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "Keep" }));
    expect(onChange).toHaveBeenCalledWith("keep");
  });

  it("arrow keys move the selection and wrap", () => {
    const onChange = vi.fn();
    render(<DestinationToggle variant="segmented" value="sell" onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("radio", { name: "Sell" }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("donate");
    fireEvent.keyDown(screen.getByRole("radio", { name: "Sell" }), { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith("keep");
  });

  it("only the checked segment is in the tab order; with none checked, the first is", () => {
    const { rerender } = render(<DestinationToggle variant="segmented" value="keep" onChange={() => {}} />);
    expect(screen.getAllByRole("radio").map((r) => r.tabIndex)).toEqual([-1, -1, 0]);
    rerender(<DestinationToggle variant="segmented" value={undefined} onChange={() => {}} />);
    expect(screen.getAllByRole("radio").map((r) => r.tabIndex)).toEqual([0, -1, -1]);
  });
});
