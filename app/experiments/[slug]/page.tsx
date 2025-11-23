import { notFound } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
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
import Link from "next/link";
import TabsContent from "./tabs-content";

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
    throw new Error(`Failed to resolve params: ${error?.message || String(error)}`);
  }
  
  try {
    experiment = await getExperimentBySlug(slug);
  } catch (error: any) {
    console.error("[ExperimentDetailPage] Error fetching experiment:", error);
    throw new Error(`Failed to fetch experiment: ${error?.message || String(error)}`);
  }

  if (!experiment) {
    notFound();
  }

  // Parallelize all data fetching operations
  const [prototype, documentation, fileChecks] = await Promise.all([
    getPrototypeByExperimentId(experiment.id).catch(() => null),
    getDocumentationByExperimentId(experiment.id).catch(() => null),
    checkExperimentFiles(experiment.directory).catch(() => ({
      hasPRDFile: false,
      hasPrototypeDir: false,
      hasMRFile: false,
      mrContent: null,
    })),
  ]);

  const { hasPRDFile, hasPrototypeDir: hasPrototypeFiles, hasMRFile, mrContent } = fileChecks;

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
        console.error("[ExperimentDetailPage] Error reading/parsing PRD:", error);
      }
      return null;
    })(),
    (async () => {
      if (!mrContent) return null;
      try {
        return parseMarketResearch(mrContent);
      } catch (error) {
        console.error("[ExperimentDetailPage] Error parsing Market Research:", error);
      }
      return null;
    })(),
  ]);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="p-8">
        <div className="mx-auto max-w-7xl">
          {/* Breadcrumbs */}
          <nav className="mb-6 text-sm">
            <ol className="flex items-center gap-2 text-text-secondary">
              <li>
                <Link href="/" className="hover:text-accent-primary">
                  Experiments
                </Link>
              </li>
              <li>/</li>
              <li className="text-text-primary">{experiment.name}</li>
            </ol>
          </nav>

          {/* Header Section */}
          <div className="mb-8 flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-4xl font-semibold text-text-primary">{experiment.name}</h1>
              <p className="mt-2 text-lg text-text-secondary">{experiment.statement}</p>
            </div>
          </div>

          {/* Main Content - Tabs */}
          <TabsContent
            experiment={experiment}
            prd={prd}
            mr={mr}
            prototype={prototype}
            documentation={documentation}
            hasPRDFile={hasPRDFile}
            hasMRFile={hasMRFile}
            hasPrototypeFiles={hasPrototypeFiles}
          />
        </div>
      </main>
    </div>
  );
}
