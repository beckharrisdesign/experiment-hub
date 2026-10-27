import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PendingPasses from "@/app/estate-sale-planner/PendingPasses";
import { fixtureFlags } from "@/lib/estate-sale-planner/flag";
import { newSession } from "@/lib/estate-sale-planner/session";
import { listHistory, loadSession, readSaved, saveCopy } from "@/lib/estate-sale-planner/storage";

const pass = { id: "p1", saleId: "s1", previews: ["data:a", "data:b", "data:c"] };

describe("PendingPasses · photos read in the background", () => {
  it("shows the photos being read, without blocking anything", () => {
    render(<PendingPasses passes={[pass]} onRetry={() => {}} onDismiss={() => {}} />);
    expect(screen.getByText("Reading 3 photos…")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("a failed pass says so and offers Try again or Leave them out", () => {
    const onRetry = vi.fn();
    const onDismiss = vi.fn();
    render(<PendingPasses passes={[{ ...pass, error: "HTTP 500" }]} onRetry={onRetry} onDismiss={onDismiss} />);
    expect(screen.getByText(/didn.t come back: HTTP 500/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    fireEvent.click(screen.getByRole("button", { name: "Leave them out" }));
    expect(onRetry).toHaveBeenCalledWith("p1");
    expect(onDismiss).toHaveBeenCalledWith("p1");
  });

  it("renders nothing with no passes", () => {
    const { container } = render(<PendingPasses passes={[]} onRetry={() => {}} onDismiss={() => {}} />);
    expect(container.innerHTML).toBe("");
  });
});

describe("saveCopy / readSaved · a pass that lands on a sale you've left", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("updates the saved copy and Home entry without making it the active sale", () => {
    const s = newSession(fixtureFlags().items, new Date("2026-10-13T12:00:00Z"), [], "CCE Neighborhood Sale");
    saveCopy(s);
    expect(readSaved(s.id)?.items.length).toBe(s.items.length);
    expect(listHistory()[0].id).toBe(s.id);
    expect(loadSession()).toBeNull();
  });

  it("readSaved is null for a sale that isn't here", () => {
    expect(readSaved("nope")).toBeNull();
  });
});
