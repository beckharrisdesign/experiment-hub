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
