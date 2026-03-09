/**
 * Workflow sync tests — guard against drift between the workflow state machine
 * (lib/workflow-states.ts) and the cell components (components/WorkflowCells.tsx).
 *
 * Both the /workflow page and the experiment list table use the same WORKFLOW_STATES
 * constant and the same PRDCell / LandingPageCell components, so these tests act as
 * a contract: if the state definitions or component logic change, the tests fail
 * and highlight the inconsistency before it ships.
 */

import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { WORKFLOW_STATES } from "@/lib/workflow-states";
import { PRDCell, LandingPageCell } from "@/components/WorkflowCells";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPRDCell(state: (typeof WORKFLOW_STATES)[number]) {
  return render(
    <PRDCell hasMRFile={state.hasMRFile} hasPRDFile={state.hasPRDFile} href="#prd" />
  );
}

function renderLandingCell(state: (typeof WORKFLOW_STATES)[number]) {
  return render(
    <LandingPageCell
      hasPRDFile={state.hasPRDFile}
      hasLandingPage={state.hasLandingPage}
      planHref="#landing"
      viewHref="#landing"
    />
  );
}

// ---------------------------------------------------------------------------
// Expected outputs per named state
// ---------------------------------------------------------------------------

const PRD_CELL_EXPECTATIONS: Record<string, () => void> = {
  "New Experiment": () => {
    expect(screen.queryByRole("link")).toBeNull();
  },
  "Market Validation": () => {
    expect(screen.getByRole("link", { name: "Create" })).toBeInTheDocument();
  },
  PRD: () => {
    expect(screen.getByRole("link", { name: "View" })).toBeInTheDocument();
  },
  "Landing Page": () => {
    expect(screen.getByRole("link", { name: "View" })).toBeInTheDocument();
  },
  Prototype: () => {
    expect(screen.getByRole("link", { name: "View" })).toBeInTheDocument();
  },
};

const LANDING_CELL_EXPECTATIONS: Record<string, () => void> = {
  "New Experiment": () => {
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByText(/Plan|Planned|Live|View|Complete/)).toBeNull();
  },
  "Market Validation": () => {
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByText(/Plan|Planned|Live|View|Complete/)).toBeNull();
  },
  PRD: () => {
    // PRD exists, no landing page yet → "Plan"
    expect(screen.getByRole("link", { name: "Plan" })).toBeInTheDocument();
  },
  "Landing Page": () => {
    // Landing page exists → "View"
    expect(screen.getByRole("link", { name: "View" })).toBeInTheDocument();
  },
  Prototype: () => {
    // Landing page still present → "View"
    expect(screen.getByRole("link", { name: "View" })).toBeInTheDocument();
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Workflow state machine coverage", () => {
  it("has exactly 5 named states", () => {
    expect(WORKFLOW_STATES).toHaveLength(5);
    const names = WORKFLOW_STATES.map((s) => s.state);
    expect(names).toEqual([
      "New Experiment",
      "Market Validation",
      "PRD",
      "Landing Page",
      "Prototype",
    ]);
  });

  it("states have strictly increasing capabilities (no skipped prerequisites)", () => {
    for (let i = 1; i < WORKFLOW_STATES.length; i++) {
      const prev = WORKFLOW_STATES[i - 1];
      const curr = WORKFLOW_STATES[i];
      // A later state must never lose a capability gained in an earlier state
      if (prev.hasMRFile) expect(curr.hasMRFile).toBe(true);
      if (prev.hasPRDFile) expect(curr.hasPRDFile).toBe(true);
      if (prev.hasLandingPage) expect(curr.hasLandingPage).toBe(true);
      if (prev.hasPrototypeDir) expect(curr.hasPrototypeDir).toBe(true);
    }
  });

  it("all expected state names have PRD cell expectations defined", () => {
    for (const state of WORKFLOW_STATES) {
      expect(PRD_CELL_EXPECTATIONS).toHaveProperty(state.state);
    }
  });

  it("all expected state names have Landing Page cell expectations defined", () => {
    for (const state of WORKFLOW_STATES) {
      expect(LANDING_CELL_EXPECTATIONS).toHaveProperty(state.state);
    }
  });
});

describe("PRDCell renders correctly for each workflow state", () => {
  for (const state of WORKFLOW_STATES) {
    it(`state: ${state.state}`, () => {
      const { unmount } = renderPRDCell(state);
      PRD_CELL_EXPECTATIONS[state.state]();
      unmount();
    });
  }
});

describe("LandingPageCell renders correctly for each workflow state", () => {
  for (const state of WORKFLOW_STATES) {
    it(`state: ${state.state}`, () => {
      const { unmount } = renderLandingCell(state);
      LANDING_CELL_EXPECTATIONS[state.state]();
      unmount();
    });
  }
});
