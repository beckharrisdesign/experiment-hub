import { describe, it, expect } from "vitest";
import type { Experiment } from "@/types";
import {
  resolveOpenSpecChangeId,
  formatBhdPhaseLabel,
} from "@/lib/openspec-shared";
import { loadOpenSpecLifecycle } from "@/lib/openspec-server";
import { getExperimentHrefSlug } from "@/lib/utils";
import { getExperimentBySlug } from "@/lib/data";

const baseExperiment: Experiment = {
  id: "pomodoro-maker",
  name: "Pomodoro Maker",
  statement: "Timer experiment",
  directory: "experiments/pomodoro-maker",
  documentationId: "doc-pomodoro-maker",
  prototypeId: "",
  status: "Active",
  createdDate: "2026-05-20",
  lastModified: "2026-05-20",
  tags: [],
  openspecChangeId: "pomodoro-maker",
  openspecSchema: "bhd-experiment",
};

describe("resolveOpenSpecChangeId", () => {
  it("uses explicit openspecChangeId when set", () => {
    expect(
      resolveOpenSpecChangeId({
        ...baseExperiment,
        openspecChangeId: "custom-change",
      }),
    ).toBe("custom-change");
  });

  it("falls back to experiment id", () => {
    expect(
      resolveOpenSpecChangeId({
        ...baseExperiment,
        openspecChangeId: undefined,
      }),
    ).toBe("pomodoro-maker");
  });
});

describe("formatBhdPhaseLabel", () => {
  it("capitalizes phase name", () => {
    expect(formatBhdPhaseLabel("explore")).toBe("Explore");
  });
});

describe("getExperimentHrefSlug", () => {
  it("uses id when name slug differs from id", () => {
    expect(
      getExperimentHrefSlug({
        id: "etsy-listing-manager",
        name: "Etsy Patternator",
      }),
    ).toBe("etsy-listing-manager");
  });

  it("uses name slug when it matches id", () => {
    expect(
      getExperimentHrefSlug({
        id: "pomodoro-maker",
        name: "Pomodoro Maker",
      }),
    ).toBe("pomodoro-maker");
  });
});

describe("getExperimentBySlug", () => {
  it("finds pomodoro-maker by id slug", async () => {
    const exp = await getExperimentBySlug("pomodoro-maker");
    expect(exp?.id).toBe("pomodoro-maker");
  });
});

describe("loadOpenSpecLifecycle", () => {
  it("loads explore.md for pomodoro-maker change on disk", async () => {
    const lifecycle = await loadOpenSpecLifecycle(baseExperiment);
    expect(lifecycle).not.toBeNull();
    expect(lifecycle?.currentPhase).toBe("explore");
    expect(lifecycle?.artifacts.some((a) => a.phase === "explore")).toBe(true);
    expect(lifecycle?.artifacts[0].content).toContain("Hypothesis");
  });
});
