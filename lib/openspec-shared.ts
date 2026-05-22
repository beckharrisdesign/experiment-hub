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

// Maps BHD phase slots → display label for each schema
const LITE_PHASE_LABELS: Record<BhdPhase, string> = {
  explore: "Spec",
  propose: "Proposal",
  apply: "Design",
  archive: "Tasks",
};

export function formatBhdPhaseLabel(phase: BhdPhase, schema?: string): string {
  if (schema === "experiment-hub-lite") {
    return LITE_PHASE_LABELS[phase];
  }
  return phase.charAt(0).toUpperCase() + phase.slice(1);
}

export type ExperimentDetailTab = {
  id: string;
  label: string;
};

const BHD_PHASE_ORDER: BhdPhase[] = ["explore", "propose", "apply", "archive"];

function hasTrimmedContent(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

export function buildExperimentDetailTabs(options: {
  openSpecLifecycle: OpenSpecLifecycle | null;
  businessCaseContent: string | null;
  prdRawContent: string | null;
}): ExperimentDetailTab[] {
  const tabs: ExperimentDetailTab[] = [];

  if (options.openSpecLifecycle) {
    for (const phase of BHD_PHASE_ORDER) {
      const artifact = options.openSpecLifecycle.artifacts.find(
        (a) => a.phase === phase,
      );
      if (artifact && artifact.content.trim().length > 0) {
        tabs.push({ id: phase, label: formatBhdPhaseLabel(phase, options.openSpecLifecycle.schema) });
      }
    }
  }

  if (hasTrimmedContent(options.businessCaseContent)) {
    tabs.push({ id: "business-case", label: "Business Case" });
  }
  if (hasTrimmedContent(options.prdRawContent)) {
    tabs.push({ id: "prd", label: "PRD" });
  }

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
