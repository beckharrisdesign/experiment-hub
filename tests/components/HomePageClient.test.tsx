/**
 * Homepage tab bucketing and the inactive-row link gate.
 *
 * Two behaviours this covers, both from the 2026-08-21 catalog change:
 *   1. Active/Inactive split keys on the full inactive set (Abandoned,
 *      Archived, On Hold) rather than "Abandoned" alone. The old filter is why
 *      an Archived row like Landing Zone rendered as live work.
 *   2. Inactive rows are listed but not navigable — linking a dead experiment
 *      would mean bringing its detail page up to presentable standard first,
 *      and that cost is what stops kills being recorded.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HomePageClient from "@/app/page-client";
import type { Experiment, ExperimentStatus } from "@/types";

vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));

function experiment(
  id: string,
  name: string,
  status: ExperimentStatus,
): Experiment {
  return {
    id,
    name,
    statement: `${name} statement`,
    directory: id,
    documentationId: `${id}-docs`,
    prototypeId: `${id}-proto`,
    status,
    createdDate: "2026-01-01",
    lastModified: "2026-01-01",
    tags: [],
  };
}

const ROWS = [
  experiment("live-one", "Live One", "Active"),
  experiment("shipped-one", "Shipped One", "Completed"),
  experiment("dead-one", "Dead One", "Abandoned"),
  experiment("filed-one", "Filed One", "Archived"),
  experiment("paused-one", "Paused One", "On Hold"),
];

function renderHome() {
  return render(<HomePageClient initialExperiments={ROWS} />);
}

/** The Inactive tab button, matched on its label rather than order. */
function inactiveTab() {
  return screen.getByRole("button", { name: /^Inactive/ });
}

describe("HomePageClient tab bucketing", () => {
  it("counts only live work as active", () => {
    renderHome();
    // Active One + Shipped One — the three inactive statuses are excluded.
    expect(
      screen.getByRole("button", { name: /^Active \(2\)/ }),
    ).toBeInTheDocument();
    expect(inactiveTab()).toHaveTextContent("Inactive (3)");
  });

  it("keeps Archived and On Hold out of the Active tab", () => {
    renderHome();
    expect(screen.getByText("Live One")).toBeInTheDocument();
    // The regression this change fixes: Archived used to land here.
    expect(screen.queryByText("Filed One")).not.toBeInTheDocument();
    expect(screen.queryByText("Paused One")).not.toBeInTheDocument();
    expect(screen.queryByText("Dead One")).not.toBeInTheDocument();
  });

  it("lists all three inactive statuses on the Inactive tab", () => {
    renderHome();
    fireEvent.click(inactiveTab());
    expect(screen.getByText("Dead One")).toBeInTheDocument();
    expect(screen.getByText("Filed One")).toBeInTheDocument();
    expect(screen.getByText("Paused One")).toBeInTheDocument();
    expect(screen.queryByText("Live One")).not.toBeInTheDocument();
  });
});

describe("HomePageClient inactive-row link gate", () => {
  it("links active rows to their detail page", () => {
    renderHome();
    expect(screen.getByText("Live One").closest("a")).toHaveAttribute(
      "href",
      "/experiments/live-one",
    );
  });

  it("does not link any inactive row", () => {
    renderHome();
    fireEvent.click(inactiveTab());
    for (const name of ["Dead One", "Filed One", "Paused One"]) {
      expect(screen.getByText(name).closest("a")).toBeNull();
    }
  });
});
