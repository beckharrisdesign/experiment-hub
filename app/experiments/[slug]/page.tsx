import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Header from "@/components/Header";
import {
  getExperimentBySlug,
  checkExperimentFiles,
  readPRD,
  readBusinessCase,
  parsePRD,
  parseMarketResearch,
} from "@/lib/data";
import { loadOpenSpecLifecycle } from "@/lib/openspec";
import { getContent } from "@/lib/supabase";
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

  const cookieStore = await cookies();
  const editCookie = cookieStore.get("hub-edit");
  const isEditor =
    !!editCookie && editCookie.value === process.env.ADMIN_SECRET;

  const fileChecks = await checkExperimentFiles(experiment.directory).catch(
    () => ({
      hasPRDFile: false,
      hasPrototypeDir: false,
      hasMRFile: false,
      hasLandingPage: false,
      mrContent: null,
      learningsContent: null,
    }),
  );

  const { hasPRDFile, mrContent } = fileChecks;

  // Read all content in parallel — Supabase overrides file for editable content
  const openSpecLifecycle = await loadOpenSpecLifecycle(experiment).catch(
    () => null,
  );

  const [prd, prdRawContent, mr, businessCaseContent] = await Promise.all([
    (async () => {
      if (!hasPRDFile) return null;
      try {
        const saved = await getContent(slug, "prd").catch(() => null);
        const prdContent = saved ?? (await readPRD(experiment.directory));
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
      try {
        const saved = await getContent(slug, "prd").catch(() => null);
        return (
          saved ?? (hasPRDFile ? await readPRD(experiment.directory) : null)
        );
      } catch {
        return null;
      }
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
    (async () => {
      try {
        const saved = await getContent(slug, "business_case").catch(() => null);
        return saved ?? (await readBusinessCase(experiment.directory));
      } catch {
        return null;
      }
    })(),
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <ExperimentDetailClient
        experiment={experiment}
        slug={slug}
        prd={prd}
        prdRawContent={prdRawContent}
        mr={mr}
        businessCaseContent={businessCaseContent}
        openSpecLifecycle={openSpecLifecycle}
        isEditor={isEditor}
      />
    </div>
  );
}
