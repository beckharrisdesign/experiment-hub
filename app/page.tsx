import { getExperiments, getPrototypes, getDocumentation, hasPRD, hasPrototype } from "@/lib/data";
import HomePageClient from "./page-client";
import type { Experiment, Prototype, Documentation } from "@/types";

interface ExperimentWithRelated extends Experiment {
  prototype?: Prototype | null;
  documentation?: Documentation | null;
  hasPRDFile?: boolean;
  hasPrototypeDir?: boolean;
}

export default async function HomePage() {
  const experiments = await getExperiments();
  const prototypes = await getPrototypes();
  const docs = await getDocumentation();

  // Enrich experiments with related data
  const experimentsWithRelated: ExperimentWithRelated[] = await Promise.all(
    experiments.map(async (exp) => ({
      ...exp,
      prototype: prototypes.find((p) => p.experimentId === exp.id) || null,
      documentation: docs.find((d) => d.experimentId === exp.id) || null,
      hasPRDFile: await hasPRD(exp.directory),
      hasPrototypeDir: await hasPrototype(exp.directory),
    }))
  );

  return <HomePageClient initialExperiments={experimentsWithRelated} />;
}
