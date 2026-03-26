import { notFound } from "next/navigation";
import Header from "@/components/Header";
import {
  getExperimentBySlug,
  getPrototypeByExperimentId,
  getDocumentationByExperimentId,
  checkExperimentFiles,
  readPRD,
  parsePRD,
  parseMarketResearch,
} from "@/lib/data";
import { getRecentCommits } from "@/lib/git";
import ExperimentDetailClient from "./detail-client";

// Mark this route as dynamic to ensure it's always rendered on-demand
export const dynamic = "force-dynamic";
export const dynamicParams = true; // Allow any slug, not just pre-generated ones

export default async function ExperimentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  let slug: string;
  let experiment;

  try {
    const resolvedParams = await params;
    slug = resolvedParams.slug;
  } catch (error: any) {
    console.error("[ExperimentDetailPage] Error resolving params:", error);
    throw new Error(
      `Failed to resolve params: ${error?.message || String(error)}`,
    );
  }

  try {
    experiment = await getExperimentBySlug(slug);
  } catch (error: any) {
    console.error("[ExperimentDetailPage] Error fetching experiment:", error);
    throw new Error(
      `Failed to fetch experiment: ${error?.message || String(error)}`,
    );
  }

  if (!experiment) {
    notFound();
  }

  const showPrototypes = process.env.SHOW_PROTOTYPES === "true";

  // Parallelize all data fetching operations
  const [prototype, documentation, fileChecks] = await Promise.all([
    showPrototypes
      ? getPrototypeByExperimentId(experiment.id).catch(() => null)
      : Promise.resolve(null),
    getDocumentationByExperimentId(experiment.id).catch(() => null),
    checkExperimentFiles(experiment.directory).catch(() => ({
      hasPRDFile: false,
      hasPrototypeDir: false,
      hasMRFile: false,
      mrContent: null,
    })),
  ]);

  const {
    hasPRDFile,
    hasPrototypeDir: hasPrototypeFiles,
    hasMRFile,
    mrContent,
  } = fileChecks;

  // Read and parse documents in parallel
  const [prd, mr] = await Promise.all([
    (async () => {
      if (!hasPRDFile) return null;
      try {
        const prdContent = await readPRD(experiment.directory);
        if (prdContent && prdContent.trim().length > 0) {
          return parsePRD(prdContent);
        }
      } catch (error) {
        console.error(
          "[ExperimentDetailPage] Error reading/parsing PRD:",
          error,
        );
      }
      return null;
    })(),
    (async () => {
      if (!mrContent) return null;
      try {
        return parseMarketResearch(mrContent);
      } catch (error) {
        console.error(
          "[ExperimentDetailPage] Error parsing Market Research:",
          error,
        );
      }
      return null;
    })(),
  ]);

  const recentCommits = getRecentCommits(3);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <ExperimentDetailClient
        experiment={experiment}
        prd={prd}
        mr={mr}
        prototype={prototype}
        documentation={documentation}
        hasPRDFile={hasPRDFile}
        hasMRFile={hasMRFile}
        hasPrototypeFiles={hasPrototypeFiles}
        recentCommits={recentCommits}
      />
    </div>
  );
}
