/**
 * Tests for lib/workflow-states.ts
 *
 * The workflow state definitions are the canonical source of truth for how
 * experiments progress through the pipeline. These tests verify the data
 * is internally consistent so that the workflow page and WorkflowCells
 * component always have a valid model to render.
 */
import { describe, it, expect } from "vitest";
import { WORKFLOW_STATES, type WorkflowState } from "@/lib/workflow-states";

const EXPECTED_STATE_NAMES = [
  "New Experiment",
  "Market Validation",
  "PRD",
  "Landing Page",
  "Prototype",
];

describe("WORKFLOW_STATES", () => {
  it("exports exactly 5 states", () => {
    expect(WORKFLOW_STATES).toHaveLength(5);
  });

  it("states are in the expected order", () => {
    const names = WORKFLOW_STATES.map((s) => s.state);
    expect(names).toEqual(EXPECTED_STATE_NAMES);
  });

  it("every state has a non-empty state name, condition, and description", () => {
    for (const s of WORKFLOW_STATES) {
      expect(s.state, `state name`).toBeTruthy();
      expect(s.condition, `condition for "${s.state}"`).toBeTruthy();
      expect(s.description, `description for "${s.state}"`).toBeTruthy();
    }
  });

  // ---------------------------------------------------------------------------
  // First state: New Experiment
  // ---------------------------------------------------------------------------

  describe("New Experiment (index 0)", () => {
    const state = WORKFLOW_STATES[0];

    it("has no artifacts", () => {
      expect(state.hasMRFile).toBe(false);
      expect(state.hasPRDFile).toBe(false);
      expect(state.hasLandingPage).toBe(false);
      expect(state.hasPrototypeDir).toBe(false);
    });

    it("has null scores because scoring hasn't happened yet", () => {
      expect(state.scores).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Market Validation (index 1)
  // ---------------------------------------------------------------------------

  describe("Market Validation (index 1)", () => {
    const state = WORKFLOW_STATES[1];

    it("has MR file but no PRD, landing page, or prototype", () => {
      expect(state.hasMRFile).toBe(true);
      expect(state.hasPRDFile).toBe(false);
      expect(state.hasLandingPage).toBe(false);
      expect(state.hasPrototypeDir).toBe(false);
    });

    it("has scores", () => {
      expect(state.scores).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // PRD (index 2)
  // ---------------------------------------------------------------------------

  describe("PRD (index 2)", () => {
    const state = WORKFLOW_STATES[2];

    it("has MR file and PRD but no landing page or prototype", () => {
      expect(state.hasMRFile).toBe(true);
      expect(state.hasPRDFile).toBe(true);
      expect(state.hasLandingPage).toBe(false);
      expect(state.hasPrototypeDir).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Landing Page (index 3)
  // ---------------------------------------------------------------------------

  describe("Landing Page (index 3)", () => {
    const state = WORKFLOW_STATES[3];

    it("has MR file, PRD, and landing page but no prototype", () => {
      expect(state.hasMRFile).toBe(true);
      expect(state.hasPRDFile).toBe(true);
      expect(state.hasLandingPage).toBe(true);
      expect(state.hasPrototypeDir).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Prototype (index 4) — terminal state
  // ---------------------------------------------------------------------------

  describe("Prototype (index 4)", () => {
    const state = WORKFLOW_STATES[4];

    it("has all artifacts", () => {
      expect(state.hasMRFile).toBe(true);
      expect(state.hasPRDFile).toBe(true);
      expect(state.hasLandingPage).toBe(true);
      expect(state.hasPrototypeDir).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Invariants across all states
  // ---------------------------------------------------------------------------

  describe("state progression invariants", () => {
    it("if hasPrototypeDir is true then hasLandingPage must also be true", () => {
      for (const s of WORKFLOW_STATES) {
        if (s.hasPrototypeDir) {
          expect(
            s.hasLandingPage,
            `"${s.state}" has prototype but no landing page`,
          ).toBe(true);
        }
      }
    });

    it("if hasLandingPage is true then hasPRDFile must also be true", () => {
      for (const s of WORKFLOW_STATES) {
        if (s.hasLandingPage) {
          expect(s.hasPRDFile, `"${s.state}" has landing page but no PRD`).toBe(
            true,
          );
        }
      }
    });

    it("if hasPRDFile is true then hasMRFile must also be true", () => {
      for (const s of WORKFLOW_STATES) {
        if (s.hasPRDFile) {
          expect(s.hasMRFile, `"${s.state}" has PRD but no MR file`).toBe(true);
        }
      }
    });

    it("only the first state (New Experiment) has null scores", () => {
      const nullScoreStates = WORKFLOW_STATES.filter((s) => s.scores === null);
      expect(nullScoreStates).toHaveLength(1);
      expect(nullScoreStates[0].state).toBe("New Experiment");
    });

    it("all scores are integers between 1 and 5", () => {
      const scoreKeys: (keyof NonNullable<WorkflowState["scores"]>)[] = [
        "businessOpportunity",
        "personalImpact",
        "competitiveAdvantage",
        "platformCost",
        "socialImpact",
      ];

      for (const s of WORKFLOW_STATES) {
        if (s.scores === null) continue;
        for (const key of scoreKeys) {
          const val = s.scores[key];
          expect(val, `"${s.state}" scores.${key}`).toBeGreaterThanOrEqual(1);
          expect(val, `"${s.state}" scores.${key}`).toBeLessThanOrEqual(5);
          expect(
            Number.isInteger(val),
            `"${s.state}" scores.${key} is an integer`,
          ).toBe(true);
        }
      }
    });

    it("every scores object has all five score dimensions", () => {
      for (const s of WORKFLOW_STATES) {
        if (s.scores === null) continue;
        expect(s.scores).toHaveProperty("businessOpportunity");
        expect(s.scores).toHaveProperty("personalImpact");
        expect(s.scores).toHaveProperty("competitiveAdvantage");
        expect(s.scores).toHaveProperty("platformCost");
        expect(s.scores).toHaveProperty("socialImpact");
      }
    });
  });
});
