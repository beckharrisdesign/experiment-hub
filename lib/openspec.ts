/**
 * Client-safe re-exports only. Server filesystem APIs live in openspec-server.ts.
 * Kept for backward compatibility with cached dev bundles that still resolve this path.
 */
export {
  resolveOpenSpecChangeId,
  formatBhdPhaseLabel,
  type BhdPhase,
  type OpenSpecLifecycle,
  type OpenSpecPhaseArtifact,
} from "@/lib/openspec-shared";
