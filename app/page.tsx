export const dynamic = "force-dynamic";

import {
  getExperiments,
  getPrototypes,
  getDocumentation,
  checkExperimentFiles,
  parseMarketResearch,
} from "@/lib/data";
import HomePageClient from "./page-client";
import type { Experiment, Prototype, Documentation } from "@/types";
import { loadOpenSpecLifecycle } from "@/lib/openspec-server";
import type { BhdPhase } from "@/lib/openspec-shared";
import { requireAdminCookie } from "@/lib/admin-auth";

interface ExperimentWithRelated extends Experiment {
  prototype?: Prototype | null;
  documentation?: Documentation | null;
  hasPRDFile?: boolean;
  hasPrototypeDir?: boolean;
  hasLandingPage?: boolean;
  moa?: string | null;
  goNoGo?: string | null;
  somYear1?: string | null;
  somYear3?: string | null;
  openSpecPhase?: BhdPhase | null;
}

export default async function HomePage() {
  const showPrototypes = process.env.SHOW_PROTOTYPES === "true";

  try {
    const allExperiments = await getExperiments();
    // Admin edit mode (the `hub-edit` cookie) sees every row and the OpenSpec
    // phase chip; anonymous visitors see neither private rows nor the chip.
    const editMode = await requireAdminCookie();
    const experiments = allExperiments.filter(
      (exp) => editMode || exp.public !== false,
    );
    const prototypes = showPrototypes ? await getPrototypes() : [];
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
          const [fileChecks, openSpecLifecycle] = await Promise.all([
            checkExperimentFiles(exp.directory),
            // The OpenSpec phase chip is an internal process indicator — only
            // load it in admin edit mode so it never renders publicly.
            editMode ? loadOpenSpecLifecycle(exp).catch(() => null) : null,
          ]);

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
            prototype: showPrototypes ? prototypeMap.get(exp.id) || null : null,
            documentation: docsMap.get(exp.id) || null,
            hasPRDFile: fileChecks.hasPRDFile,
            hasPrototypeDir: showPrototypes
              ? fileChecks.hasPrototypeDir
              : false,
            hasLandingPage: fileChecks.hasLandingPage,
            moa,
            goNoGo,
            somYear1,
            somYear3,
            openSpecPhase: openSpecLifecycle?.currentPhase ?? null,
          };
        } catch (error) {
          console.error(
            `[HomePage] Error processing experiment ${exp.id}:`,
            error,
          );
          // Return experiment with minimal data if processing fails
          return {
            ...exp,
            prototype: prototypeMap.get(exp.id) || null,
            documentation: docsMap.get(exp.id) || null,
            hasPRDFile: false,
            hasPrototypeDir: false,
            hasLandingPage: false,
            moa: null,
            goNoGo: null,
            somYear1: null,
            somYear3: null,
            openSpecPhase: null,
          };
        }
      }),
    );

    return <HomePageClient initialExperiments={experimentsWithRelated} />;
  } catch (error) {
    console.error("[HomePage] Fatal error:", error);
    throw error;
  }
}
