/**
 * Homepage catalog rendering.
 *
 * Notion is the source of truth for what appears here: every experiment it
 * returns is listed, in one table, with no status-derived bucketing. The only
 * filtering the client does is HIDDEN_EXPERIMENT_IDS, which drops the
 * repository row that isn't an experiment. Visibility is a Notion decision
 * (the `Public` checkbox), not a client-side one — these tests exist to keep
 * that from drifting back into code.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
  experiment("filed-one", "Filed One", "Archived"),
];

function renderHome(rows: Experiment[] = ROWS) {
  return render(<HomePageClient initialExperiments={rows} />);
}

describe("HomePageClient", () => {
  it("renders every experiment it is given, whatever the status", () => {
    renderHome();
    for (const name of ["Live One", "Shipped One", "Filed One"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it("renders one table with no status tabs", () => {
    renderHome();
    expect(screen.queryByRole("button", { name: /^Active/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Inactive/ })).toBeNull();
  });

  it("links every row to its detail page", () => {
    renderHome();
    expect(screen.getByText("Live One").closest("a")).toHaveAttribute(
      "href",
      "/experiments/live-one",
    );
    expect(screen.getByText("Filed One").closest("a")).toHaveAttribute(
      "href",
      "/experiments/filed-one",
    );
  });

  it("hides the rows in HIDDEN_EXPERIMENT_IDS", () => {
    renderHome([
      ...ROWS,
      experiment(
        "experience-principles-repository",
        "Experience Principles Repository",
        "Active",
      ),
    ]);
    expect(screen.queryByText("Experience Principles Repository")).toBeNull();
    expect(screen.getByText("Live One")).toBeInTheDocument();
  });
});
