import { getExperiments, getPrototypes, getDocumentation, checkExperimentFiles, parseMarketResearch } from "@/lib/data";
import HomePageClient from "./page-client";
import type { Experiment, Prototype, Documentation } from "@/types";

interface ExperimentWithRelated extends Experiment {
  prototype?: Prototype | null;
  documentation?: Documentation | null;
  hasPRDFile?: boolean;
  hasPrototypeDir?: boolean;
  hasMRFile?: boolean;
  hasLandingPage?: boolean;
  moa?: string | null;
  goNoGo?: string | null;
  somYear1?: string | null;
  somYear3?: string | null;
}

export default async function HomePage() {
  try {
    const experiments = await getExperiments();
    const prototypes = await getPrototypes();
    const docs = await getDocumentation();

    // Create Maps for O(1) lookups instead of O(n) array.find() operations
    const prototypeMap = new Map(prototypes.map((p) => [p.experimentId, p]));
    const docsMap = new Map(docs.map((d) => [d.experimentId, d]));

    // Enrich experiments with related data
    // All file checks are now batched and parallelized per experiment
    const experimentsWithRelated: ExperimentWithRelated[] = await Promise.all(
      experiments.map(async (exp) => {
        try {
          // Batch all file system operations in parallel for this experiment
          const fileChecks = await checkExperimentFiles(exp.directory);
          
          // Parse market research if available
          let moa: string | null = null;
          let goNoGo: string | null = null;
          let somYear1: string | null = null;
          let somYear3: string | null = null;
          
          if (fileChecks.mrContent) {
            try {
              const mr = parseMarketResearch(fileChecks.mrContent);
              moa = mr.moa;
              goNoGo = mr.goNoGo;
              somYear1 = mr.somYear1;
              somYear3 = mr.somYear3;
            } catch {
              // Error parsing market research, continue without it
            }
          }

          return {
            ...exp,
            prototype: prototypeMap.get(exp.id) || null,
            documentation: docsMap.get(exp.id) || null,
            hasPRDFile: fileChecks.hasPRDFile,
            hasPrototypeDir: fileChecks.hasPrototypeDir,
            hasMRFile: fileChecks.hasMRFile,
            hasLandingPage: fileChecks.hasLandingPage,
            moa,
            goNoGo,
            somYear1,
            somYear3,
          };
        } catch (error) {
          console.error(`[HomePage] Error processing experiment ${exp.id}:`, error);
          // Return experiment with minimal data if processing fails
          return {
            ...exp,
            prototype: prototypeMap.get(exp.id) || null,
            documentation: docsMap.get(exp.id) || null,
            hasPRDFile: false,
            hasPrototypeDir: false,
            hasMRFile: false,
            hasLandingPage: false,
            moa: null,
            goNoGo: null,
            somYear1: null,
            somYear3: null,
          };
        }
      })
    );

    return <HomePageClient initialExperiments={experimentsWithRelated} />;
  } catch (error) {
    console.error("[HomePage] Fatal error:", error);
    throw error;
  }
}
