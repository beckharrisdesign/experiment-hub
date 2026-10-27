import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Lists from "@/app/estate-sale-planner/Lists";
import { fixtureFlags } from "@/lib/estate-sale-planner/flag";
import { newSession, setLocation } from "@/lib/estate-sale-planner/session";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));

function renderLists(session = newSession([], new Date("2026-10-27T12:00:00Z"), [], "asdfasdf")) {
  const props = { onDestination: vi.fn(), onOpen: vi.fn(), onAdd: vi.fn(), onStartSorting: vi.fn(), onAddRoom: vi.fn(), onDetails: vi.fn() };
  render(<Lists session={session} fromFixture={false} {...props} />);
  return props;
}

describe("Sale header · every sale action in one row", () => {
  it("an empty sale shows the actions and no empty Possible sale section", () => {
    renderLists();
    for (const name of ["Edit details", "Add more", "Add photos"]) expect(screen.getByRole("button", { name })).toBeTruthy();
    expect(screen.queryByText("Possible sale")).toBeNull();
    expect(screen.queryByText(/Nothing is marked to sell/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Sort/ })).toBeNull();
  });

  it("offers Sort when items are left, and shows the city in the meta line", () => {
    const s = setLocation(newSession(fixtureFlags().items, new Date("2026-10-27T12:00:00Z"), [], "CCE"), "Ithaca, NY");
    renderLists(s);
    expect(screen.getByRole("button", { name: /^Sort \d+ left$/ })).toBeTruthy();
    expect(screen.getByText(/^Ithaca, NY · \d+ items · /)).toBeTruthy();
  });

  it("Edit details saves a title and a city or ZIP", () => {
    const props = renderLists();
    fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
    fireEvent.change(screen.getByLabelText("City or ZIP"), { target: { value: "14850" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(props.onDetails).toHaveBeenCalledWith({ name: "asdfasdf", location: "14850" });
  });
});

describe("setLocation", () => {
  it("trims, caps at 40, and clears when blank", () => {
    const s = newSession([], new Date());
    expect(setLocation(s, "  14850 ").location).toBe("14850");
    expect(setLocation(s, "x".repeat(50)).location).toHaveLength(40);
    expect("location" in setLocation(setLocation(s, "14850"), "  ")).toBe(false);
  });
});
