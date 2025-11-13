import { notFound } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import ExperimentScoresDisplay from "@/components/ExperimentScores";
import Header from "@/components/Header";
import MarkdownContent from "@/components/MarkdownContent";
import {
  getExperimentBySlug,
  getPrototypeByExperimentId,
  getDocumentationByExperimentId,
  hasPRD,
  hasMarketResearch,
  hasPrototype,
  readPRD,
  readMarketResearch,
  parsePRD,
  parseMarketResearch,
} from "@/lib/data";
import Link from "next/link";

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

  let prototype = null;
  let documentation = null;
  
  try {
    prototype = await getPrototypeByExperimentId(experiment.id);
    documentation = await getDocumentationByExperimentId(experiment.id);
  } catch (error: any) {
    console.error("[ExperimentDetailPage] Error fetching related data:", error);
    // Continue without prototype/documentation
  }

  const hasPRDFile = await hasPRD(experiment.directory);
  const hasMRFile = await hasMarketResearch(experiment.directory);
  const hasPrototypeFiles = await hasPrototype(experiment.directory);

  // Read and parse documents
  let prd = null;
  let mr = null;
  
  try {
    if (hasPRDFile) {
      const prdContent = await readPRD(experiment.directory);
      if (prdContent && prdContent.trim().length > 0) {
        prd = parsePRD(prdContent);
      }
    }
  } catch (error) {
    console.error("[ExperimentDetailPage] Error reading/parsing PRD:", error);
    // Continue without PRD
  }
  
  try {
    if (hasMRFile) {
      const mrContent = await readMarketResearch(experiment.directory);
      if (mrContent && mrContent.trim().length > 0) {
        mr = parseMarketResearch(mrContent);
      }
    }
  } catch (error) {
    console.error("[ExperimentDetailPage] Error reading/parsing Market Research:", error);
    // Continue without Market Research
  }

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
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-text-secondary">
                <StatusBadge status={experiment.status} />
                <span>Created: {new Date(experiment.createdDate).toLocaleDateString()}</span>
                <span>Modified: {new Date(experiment.lastModified).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Tags */}
          {experiment.tags.length > 0 && (
            <div className="mb-8">
              <div className="flex flex-wrap gap-2">
                {experiment.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-background-tertiary px-3 py-1 text-sm text-text-secondary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="space-y-8">
            {/* Scores Section */}
            {experiment.scores && (
              <section className="rounded-lg border border-border bg-background-secondary p-6">
                <h2 className="mb-4 text-2xl font-semibold text-text-primary">
                  Experiment Scores
                </h2>
                <div className="mb-6">
                  <ExperimentScoresDisplay scores={experiment.scores} showLabels={true} />
                </div>
                {mr && experiment.scores && (
                  <div className="mt-6 rounded-md bg-background-tertiary p-4">
                    <h3 className="mb-2 text-sm font-semibold text-text-primary">
                      Score Rationale (from Market Research)
                    </h3>
                    <div className="space-y-2 text-sm text-text-secondary">
                      <p>
                        <strong className="text-text-primary">
                          Business Opportunity ({experiment.scores.businessOpportunity}/5):
                        </strong>{" "}
                        Market opportunity with TAM of ${mr.tam || "N/A"} and SAM of ${mr.sam || "N/A"}.
                        {mr.executiveSummary && (mr.executiveSummary.includes("niche") || mr.executiveSummary.includes("underserved"))
                          ? " Strong niche demand identified in market research."
                          : " Market research indicates viable opportunity."}
                      </p>
                      <p>
                        <strong className="text-text-primary">
                          Personal Impact ({experiment.scores.personalImpact}/5):
                        </strong>{" "}
                        {experiment.scores.personalImpact >= 4
                          ? "High personal value - addresses specific needs identified in the experiment statement."
                          : "Moderate personal value based on experiment goals."}
                      </p>
                      <p>
                        <strong className="text-text-primary">
                          Competitive Advantage ({experiment.scores.competitiveAdvantage}/5):
                        </strong>{" "}
                        {experiment.scores.competitiveAdvantage >= 4
                          ? "Unique positioning identified in market research with first-mover potential."
                          : "Moderate competitive positioning in the market."}
                      </p>
                      <p>
                        <strong className="text-text-primary">
                          Platform Cost ({experiment.scores.platformCost}/5):
                        </strong>{" "}
                        {experiment.scores.platformCost >= 4
                          ? "Low complexity - straightforward implementation requirements."
                          : "Moderate to high complexity - requires significant technical infrastructure."}
                      </p>
                      <p>
                        <strong className="text-text-primary">
                          Social Impact ({experiment.scores.socialImpact}/5):
                        </strong>{" "}
                        {experiment.scores.socialImpact >= 4
                          ? "High social value - addresses meaningful needs and serves underserved communities."
                          : "Moderate social value based on target market and use cases."}
                      </p>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Market Research Section */}
            {mr && (
              <section className="rounded-lg border border-border bg-background-secondary p-6">
                <h2 className="mb-4 text-2xl font-semibold text-text-primary">Market Research</h2>
                <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-md bg-background-tertiary p-4">
                    <div className="text-sm font-medium text-text-secondary">TAM</div>
                    <div className="mt-1 text-2xl font-semibold text-accent-primary">
                      ${mr.tam || "N/A"}
                    </div>
                  </div>
                  <div className="rounded-md bg-background-tertiary p-4">
                    <div className="text-sm font-medium text-text-secondary">SAM</div>
                    <div className="mt-1 text-2xl font-semibold text-accent-primary">
                      ${mr.sam || "N/A"}
                    </div>
                  </div>
                  <div className="rounded-md bg-background-tertiary p-4">
                    <div className="text-sm font-medium text-text-secondary">SOM (Year 3)</div>
                    <div className="mt-1 text-2xl font-semibold text-accent-primary">
                      ${mr.som || "N/A"}
                    </div>
                  </div>
                </div>
                {mr.executiveSummary && (
                  <div className="mb-4">
                    <h3 className="mb-2 text-lg font-semibold text-text-primary">
                      Executive Summary
                    </h3>
                    <MarkdownContent content={mr.executiveSummary} maxLines={20} />
                  </div>
                )}
                {mr.goNoGo && (
                  <div className="mt-4 rounded-md border border-accent-primary/30 bg-background-tertiary p-4">
                    <h3 className="mb-2 text-sm font-semibold text-accent-primary">
                      Go/No-Go Recommendation
                    </h3>
                    <MarkdownContent content={mr.goNoGo} maxLines={10} />
                  </div>
                )}
              </section>
            )}

            {/* PRD Section */}
            {prd && (
              <section className="rounded-lg border border-border bg-background-secondary p-6">
                <h2 className="mb-4 text-2xl font-semibold text-text-primary">
                  Product Requirements Document
                </h2>
                {prd.overview && (
                  <div className="mb-6">
                    <h3 className="mb-2 text-lg font-semibold text-text-primary">Overview</h3>
                    <MarkdownContent content={prd.overview} />
                  </div>
                )}
                {prd.problemStatement && (
                  <div className="mb-6">
                    <h3 className="mb-2 text-lg font-semibold text-text-primary">
                      Problem Statement
                    </h3>
                    <MarkdownContent content={prd.problemStatement} />
                  </div>
                )}
                {prd.goals && (
                  <div className="mb-6">
                    <h3 className="mb-2 text-lg font-semibold text-text-primary">
                      Goals & Objectives
                    </h3>
                    <MarkdownContent content={prd.goals} />
                  </div>
                )}
                {prd.targetUser && (
                  <div className="mb-6">
                    <h3 className="mb-2 text-lg font-semibold text-text-primary">Target User</h3>
                    <MarkdownContent content={prd.targetUser} />
                  </div>
                )}
                {prd.coreFeatures && (
                  <div className="mb-6">
                    <h3 className="mb-2 text-lg font-semibold text-text-primary">Core Features</h3>
                    <MarkdownContent content={prd.coreFeatures} />
                  </div>
                )}
                {prd.userStories && (
                  <div className="mb-6">
                    <h3 className="mb-2 text-lg font-semibold text-text-primary">User Stories</h3>
                    <MarkdownContent content={prd.userStories} maxLines={30} />
                  </div>
                )}
                {prd.technicalRequirements && (
                  <div className="mb-6">
                    <h3 className="mb-2 text-lg font-semibold text-text-primary">
                      Technical Requirements
                    </h3>
                    <MarkdownContent content={prd.technicalRequirements} />
                  </div>
                )}
                {prd.successMetrics && (
                  <div>
                    <h3 className="mb-2 text-lg font-semibold text-text-primary">
                      Success Metrics
                    </h3>
                    <MarkdownContent content={prd.successMetrics} />
                  </div>
                )}
              </section>
            )}

            {/* Additional Information Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Experiment Details */}
                <section className="rounded-lg border border-border bg-background-secondary p-6">
                  <h2 className="mb-4 text-xl font-semibold text-text-primary">
                    Experiment Details
                  </h2>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-text-secondary">Directory</dt>
                      <dd className="mt-1 font-mono text-sm text-text-primary">
                        {experiment.directory}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-text-secondary">Status</dt>
                      <dd className="mt-1">
                        <StatusBadge status={experiment.status} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-text-secondary">Experiment ID</dt>
                      <dd className="mt-1 font-mono text-sm text-text-primary">{experiment.id}</dd>
                    </div>
                  </dl>
                </section>

                {/* Workflow Status */}
                <section className="rounded-lg border border-border bg-background-secondary p-6">
                  <h2 className="mb-4 text-xl font-semibold text-text-primary">Workflow Status</h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">Market Research</span>
                      {hasMRFile ? (
                        <span className="text-accent-primary">✓ Complete</span>
                      ) : (
                        <span className="text-text-muted">— Not started</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">PRD</span>
                      {hasPRDFile ? (
                        <span className="text-accent-primary">✓ Complete</span>
                      ) : (
                        <span className="text-text-muted">— Not started</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">Prototype</span>
                      {hasPrototypeFiles ? (
                        <span className="text-accent-primary">✓ Complete</span>
                      ) : (
                        <span className="text-text-muted">— Not started</span>
                      )}
                    </div>
                  </div>
                </section>

                {/* Documentation Metadata */}
                {documentation && (
                  <section className="rounded-lg border border-border bg-background-secondary p-6">
                    <h2 className="mb-4 text-xl font-semibold text-text-primary">Documentation</h2>
                    <div className="space-y-2">
                      <h3 className="font-medium text-text-primary">{documentation.title}</h3>
                      <div className="text-sm text-text-secondary">
                        Last modified: {new Date(documentation.lastModified).toLocaleDateString()}
                      </div>
                      {documentation.content && (
                        <p className="mt-2 text-sm text-text-secondary">{documentation.content}</p>
                      )}
                    </div>
                  </section>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Prototype */}
                {prototype && (
                  <section className="rounded-lg border border-border bg-background-secondary p-6">
                    <h2 className="mb-4 text-xl font-semibold text-text-primary">Prototype</h2>
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-medium text-text-primary">{prototype.title}</h3>
                        <p className="mt-1 text-sm text-text-secondary">{prototype.description}</p>
                      </div>
                      <div>
                        <StatusBadge status={prototype.status} />
                      </div>
                      <div className="font-mono text-xs text-text-muted">
                        Path: {prototype.linkPath}
                      </div>
                      {hasPrototypeFiles && (
                        <div className="mt-3 text-sm text-accent-primary">
                          ✓ Prototype files exist
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Quick Actions */}
                <section className="rounded-lg border border-border bg-background-secondary p-6">
                  <h2 className="mb-4 text-xl font-semibold text-text-primary">Quick Actions</h2>
                  <div className="space-y-2 text-sm">
                    {!hasMRFile && (
                      <div className="text-text-secondary">
                        Use <code className="rounded bg-background-tertiary px-1.5 py-0.5 text-xs">@market-research</code> to conduct market analysis
                      </div>
                    )}
                    {!hasPRDFile && (
                      <div className="text-text-secondary">
                        Use <code className="rounded bg-background-tertiary px-1.5 py-0.5 text-xs">@prd-writer</code> to create PRD
                      </div>
                    )}
                    {!hasPrototypeFiles && (
                      <div className="text-text-secondary">
                        Use <code className="rounded bg-background-tertiary px-1.5 py-0.5 text-xs">@prototype-builder</code> to build prototype
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
