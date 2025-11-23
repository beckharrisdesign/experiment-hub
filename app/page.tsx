import { getExperiments, getPrototypes, getDocumentation, checkExperimentFiles, parseMarketResearch } from "@/lib/data";
import HomePageClient from "./page-client";
import type { Experiment, Prototype, Documentation } from "@/types";

interface ExperimentWithRelated extends Experiment {
  prototype?: Prototype | null;
  documentation?: Documentation | null;
  hasPRDFile?: boolean;
  hasPrototypeDir?: boolean;
  hasMRFile?: boolean;
  moa?: string | null;
  goNoGo?: string | null;
  somYear1?: string | null;
  somYear3?: string | null;
}

export default async function HomePage() {
  const experiments = await getExperiments();
  const prototypes = await getPrototypes();
  const docs = await getDocumentation();

  // Enrich experiments with related data
  // All file checks are now batched and parallelized per experiment
  const experimentsWithRelated: ExperimentWithRelated[] = await Promise.all(
    experiments.map(async (exp) => {
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
        prototype: prototypes.find((p) => p.experimentId === exp.id) || null,
        documentation: docs.find((d) => d.experimentId === exp.id) || null,
        hasPRDFile: fileChecks.hasPRDFile,
        hasPrototypeDir: fileChecks.hasPrototypeDir,
        hasMRFile: fileChecks.hasMRFile,
        moa,
        goNoGo,
        somYear1,
        somYear3,
      };
    })
  );

  return <HomePageClient initialExperiments={experimentsWithRelated} />;
}
