import { describe, it, expect } from "vitest";
import {
  buildExperimentDetailTabs,
  resolveDefaultDetailTab,
  type OpenSpecLifecycle,
} from "@/lib/openspec-shared";

const exploreOnlyLifecycle: OpenSpecLifecycle = {
  changeId: "pomodoro-maker",
  schema: "bhd-experiment",
  currentPhase: "explore",
  artifacts: [{ phase: "explore", content: "# Explore\n\nHypothesis text." }],
};

const multiPhaseLifecycle: OpenSpecLifecycle = {
  changeId: "demo",
  schema: "bhd-experiment",
  currentPhase: "propose",
  artifacts: [
    { phase: "explore", content: "explore body" },
    { phase: "propose", content: "propose body" },
  ],
};

describe("buildExperimentDetailTabs", () => {
  it("shows Explore only when only explore.md is loaded", () => {
    const tabs = buildExperimentDetailTabs({
      openSpecLifecycle: exploreOnlyLifecycle,
      businessCaseContent: null,
      prdRawContent: null,
    });
    expect(tabs).toEqual([{ id: "explore", label: "Explore" }]);
  });

  it("shows Explore and Propose in schema order", () => {
    const tabs = buildExperimentDetailTabs({
      openSpecLifecycle: multiPhaseLifecycle,
      businessCaseContent: null,
      prdRawContent: null,
    });
    expect(tabs.map((t) => t.id)).toEqual(["explore", "propose"]);
  });

  it("omits Business Case and PRD when files are empty", () => {
    const tabs = buildExperimentDetailTabs({
      openSpecLifecycle: exploreOnlyLifecycle,
      businessCaseContent: "  ",
      prdRawContent: null,
    });
    expect(tabs.some((t) => t.id === "business-case")).toBe(false);
    expect(tabs.some((t) => t.id === "prd")).toBe(false);
  });

  it("appends legacy tabs after phase tabs when content exists", () => {
    const tabs = buildExperimentDetailTabs({
      openSpecLifecycle: exploreOnlyLifecycle,
      businessCaseContent: "# Business case",
      prdRawContent: "# PRD",
    });
    expect(tabs.map((t) => t.id)).toEqual([
      "explore",
      "business-case",
      "prd",
    ]);
  });

  it("shows only legacy tabs when no OpenSpec lifecycle", () => {
    const tabs = buildExperimentDetailTabs({
      openSpecLifecycle: null,
      businessCaseContent: null,
      prdRawContent: "# Product requirements",
    });
    expect(tabs).toEqual([{ id: "prd", label: "PRD" }]);
  });
});

describe("resolveDefaultDetailTab", () => {
  it("defaults to current BHD phase when that tab exists", () => {
    const tabs = buildExperimentDetailTabs({
      openSpecLifecycle: exploreOnlyLifecycle,
      businessCaseContent: null,
      prdRawContent: null,
    });
    expect(resolveDefaultDetailTab(tabs, exploreOnlyLifecycle)).toBe("explore");
  });

  it("defaults to propose when current phase is propose", () => {
    const tabs = buildExperimentDetailTabs({
      openSpecLifecycle: multiPhaseLifecycle,
      businessCaseContent: null,
      prdRawContent: null,
    });
    expect(resolveDefaultDetailTab(tabs, multiPhaseLifecycle)).toBe("propose");
  });

  it("returns null when there are no tabs", () => {
    expect(
      resolveDefaultDetailTab([], null),
    ).toBeNull();
  });
});
