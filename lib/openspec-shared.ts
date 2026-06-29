import type { Experiment } from "@/types";

export type BhdPhase = "explore" | "propose" | "apply" | "archive";

export type OpenSpecPhaseArtifact = {
  phase: BhdPhase;
  content: string;
};

export type OpenSpecLifecycle = {
  changeId: string;
  schema: string;
  currentPhase: BhdPhase;
  artifacts: OpenSpecPhaseArtifact[];
};

export function resolveOpenSpecChangeId(experiment: Experiment): string {
  return experiment.openspecChangeId ?? experiment.id;
}

export function formatBhdPhaseLabel(phase: BhdPhase): string {
  return phase.charAt(0).toUpperCase() + phase.slice(1);
}

export type ExperimentDetailTab = {
  id: string;
  label: string;
};

const BHD_PHASE_ORDER: BhdPhase[] = ["explore", "propose", "apply", "archive"];

export function buildExperimentDetailTabs(options: {
  openSpecLifecycle: OpenSpecLifecycle | null;
}): ExperimentDetailTab[] {
  const tabs: ExperimentDetailTab[] = [];

  if (options.openSpecLifecycle) {
    for (const phase of BHD_PHASE_ORDER) {
      const artifact = options.openSpecLifecycle.artifacts.find(
        (a) => a.phase === phase,
      );
      if (artifact && artifact.content.trim().length > 0) {
        tabs.push({ id: phase, label: formatBhdPhaseLabel(phase) });
      }
    }
  }

  tabs.push({ id: "discovery", label: "Discovery" });
  tabs.push({ id: "business-case", label: "Business Case" });
  tabs.push({ id: "prd", label: "PRD" });

  return tabs;
}

export function resolveDefaultDetailTab(
  tabs: ExperimentDetailTab[],
  openSpecLifecycle: OpenSpecLifecycle | null,
): string | null {
  if (tabs.length === 0) {
    return null;
  }

  if (openSpecLifecycle) {
    const { currentPhase } = openSpecLifecycle;
    if (tabs.some((t) => t.id === currentPhase)) {
      return currentPhase;
    }
    const firstPhase = BHD_PHASE_ORDER.find((phase) =>
      tabs.some((t) => t.id === phase),
    );
    if (firstPhase) {
      return firstPhase;
    }
  }

  return tabs[0].id;
}

export function isBhdPhaseTab(tabId: string): tabId is BhdPhase {
  return (BHD_PHASE_ORDER as string[]).includes(tabId);
}
