import { describe, it, expect } from "vitest";
import type { Experiment } from "@/types";
import {
  resolveOpenSpecChangeId,
  formatBhdPhaseLabel,
} from "@/lib/openspec-shared";
import {
  loadOpenSpecLifecycle,
  __resetArchiveIndex,
} from "@/lib/openspec-server";
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
  // pomodoro-maker was archived 2026-08-14 (parked at explore). It still
  // resolves: archiving a change must not erase an experiment's lifecycle
  // story from the hub, so the loader falls back to
  // openspec/changes/archive/YYYY-MM-DD-<changeId>/.
  it("resolves a change that has been archived", async () => {
    const lifecycle = await loadOpenSpecLifecycle(baseExperiment);
    expect(lifecycle).not.toBeNull();
    expect(lifecycle?.changeId).toBe("pomodoro-maker");
  });

  it("reads phase artifacts out of the archived folder", async () => {
    const lifecycle = await loadOpenSpecLifecycle(baseExperiment);
    const explore = lifecycle?.artifacts.find((a) => a.phase === "explore");
    expect(explore).toBeDefined();
    expect(explore?.content).toContain("Hypothesis");
  });

  it("reports the latest phase present as the current phase", async () => {
    const lifecycle = await loadOpenSpecLifecycle(baseExperiment);
    // explore.md + the archive.md written at archive time → archive is latest.
    expect(lifecycle?.currentPhase).toBe("archive");
  });

  it("returns null when no change exists under either root", async () => {
    const lifecycle = await loadOpenSpecLifecycle({
      ...baseExperiment,
      openspecChangeId: "no-such-change-anywhere",
    });
    expect(lifecycle).toBeNull();
  });

  it("matches the full YYYY-MM-DD-<id> shape, not a bare suffix", async () => {
    // "maker" must not resolve to the archived "2026-08-14-pomodoro-maker".
    const lifecycle = await loadOpenSpecLifecycle({
      ...baseExperiment,
      openspecChangeId: "maker",
    });
    expect(lifecycle).toBeNull();
  });

  it("still resolves after the archive index is dropped", async () => {
    __resetArchiveIndex();
    const first = await loadOpenSpecLifecycle(baseExperiment);
    const second = await loadOpenSpecLifecycle(baseExperiment);
    expect(first?.changeId).toBe("pomodoro-maker");
    expect(second?.changeId).toBe("pomodoro-maker");
  });
});
