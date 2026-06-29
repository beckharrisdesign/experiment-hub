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
  it("always includes Discovery, Business Case, and PRD tabs", () => {
    const tabs = buildExperimentDetailTabs({ openSpecLifecycle: null });
    expect(tabs.map((t) => t.id)).toEqual([
      "discovery",
      "business-case",
      "prd",
    ]);
  });

  it("prepends BHD phase tabs before the standard three", () => {
    const tabs = buildExperimentDetailTabs({
      openSpecLifecycle: exploreOnlyLifecycle,
    });
    expect(tabs.map((t) => t.id)).toEqual([
      "explore",
      "discovery",
      "business-case",
      "prd",
    ]);
  });

  it("shows multiple BHD phases in schema order before the standard three", () => {
    const tabs = buildExperimentDetailTabs({
      openSpecLifecycle: multiPhaseLifecycle,
    });
    expect(tabs.map((t) => t.id)).toEqual([
      "explore",
      "propose",
      "discovery",
      "business-case",
      "prd",
    ]);
  });

  it("omits a BHD phase tab when its artifact has no content", () => {
    const lifecycle: OpenSpecLifecycle = {
      changeId: "x",
      schema: "bhd-experiment",
      currentPhase: "explore",
      artifacts: [
        { phase: "explore", content: "   " },
        { phase: "propose", content: "propose body" },
      ],
    };
    const tabs = buildExperimentDetailTabs({ openSpecLifecycle: lifecycle });
    expect(tabs.some((t) => t.id === "explore")).toBe(false);
    expect(tabs.some((t) => t.id === "propose")).toBe(true);
  });
});

describe("resolveDefaultDetailTab", () => {
  it("defaults to discovery when there is no OpenSpec lifecycle", () => {
    const tabs = buildExperimentDetailTabs({ openSpecLifecycle: null });
    expect(resolveDefaultDetailTab(tabs, null)).toBe("discovery");
  });

  it("defaults to current BHD phase when that tab exists", () => {
    const tabs = buildExperimentDetailTabs({
      openSpecLifecycle: exploreOnlyLifecycle,
    });
    expect(resolveDefaultDetailTab(tabs, exploreOnlyLifecycle)).toBe("explore");
  });

  it("defaults to propose when current phase is propose", () => {
    const tabs = buildExperimentDetailTabs({
      openSpecLifecycle: multiPhaseLifecycle,
    });
    expect(resolveDefaultDetailTab(tabs, multiPhaseLifecycle)).toBe("propose");
  });

  it("returns null when there are no tabs", () => {
    expect(resolveDefaultDetailTab([], null)).toBeNull();
  });
});
