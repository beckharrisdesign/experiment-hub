import { getExperiments, getPrototypes, getDocumentation, hasPRD, hasPrototype, readMarketResearch, parseMarketResearch } from "@/lib/data";
import HomePageClient from "./page-client";
import type { Experiment, Prototype, Documentation } from "@/types";

interface ExperimentWithRelated extends Experiment {
  prototype?: Prototype | null;
  documentation?: Documentation | null;
  hasPRDFile?: boolean;
  hasPrototypeDir?: boolean;
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
  const experimentsWithRelated: ExperimentWithRelated[] = await Promise.all(
    experiments.map(async (exp) => {
      let moa: string | null = null;
      let goNoGo: string | null = null;
      let somYear1: string | null = null;
      let somYear3: string | null = null;
      try {
        const mrContent = await readMarketResearch(exp.directory);
        if (mrContent) {
          const mr = parseMarketResearch(mrContent);
          moa = mr.moa;
          goNoGo = mr.goNoGo;
          somYear1 = mr.somYear1;
          somYear3 = mr.somYear3;
        }
      } catch {
        // No market research or error reading it
      }

      return {
        ...exp,
        prototype: prototypes.find((p) => p.experimentId === exp.id) || null,
        documentation: docs.find((d) => d.experimentId === exp.id) || null,
        hasPRDFile: await hasPRD(exp.directory),
        hasPrototypeDir: await hasPrototype(exp.directory),
        moa,
        goNoGo,
        somYear1,
        somYear3,
      };
    })
  );

  return <HomePageClient initialExperiments={experimentsWithRelated} />;
}
