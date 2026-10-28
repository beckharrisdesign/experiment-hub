import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TabBar from "@/app/estate-sale-planner/TabBar";

describe("TabBar · Sort label", () => {
  it("says Sorted once nothing is left", () => {
    render(<TabBar active={null} saleId="s1" left={0} />);
    expect(screen.getByRole("link", { name: "Sorted" })).toBeTruthy();
  });

  it("isn't Sorted while photos for the sale are still being read — more items are coming", () => {
    render(<TabBar active={null} saleId="s1" left={0} reading />);
    expect(screen.getByRole("link", { name: "Sort" })).toBeTruthy();
    expect(screen.queryByText("Sorted")).toBeNull();
  });
});
