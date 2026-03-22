"use client";

import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import MarkdownContent from "@/components/MarkdownContent";
import Tabs from "@/components/Tabs";
import LandingPageLink from "@/components/LandingPageLink";
import ScoreCard from "@/components/ScoreCard";
import MetricCard from "@/components/MetricCard";
import ValidationStatusBadge from "@/components/ValidationStatusBadge";
import { slugify } from "@/lib/utils";
import { Experiment, Prototype, Documentation } from "@/types";
import type { parsePRD, parseMarketResearch } from "@/lib/data";

function ScoreBadge({ value, label, fullName }: { value: number | undefined; label: string; fullName: string }) {
  if (value === undefined) {
    return <span className="text-text-muted">—</span>;
  }

  const getBadgeColor = (val: number) => {
    if (val === 5) return "bg-score-5/20 border-score-5/40 text-score-5";
    if (val === 4) return "bg-score-4/20 border-score-4/40 text-score-4";
    if (val === 3) return "bg-score-3/20 border-score-3/40 text-score-3";
    if (val === 2) return "bg-score-2/20 border-score-2/40 text-score-2";
    return "bg-score-1/20 border-score-1/40 text-score-1";
  };

  return (
    <span
      className={`inline-flex items-center justify-center h-6 w-6 rounded-md border text-xs font-medium ${getBadgeColor(
        value
      )}`}
      title={`${fullName}: ${value}/5`}
    >
      {value}
    </span>
  );
}

interface TabsContentProps {
  experiment: Experiment;
  prd: ReturnType<typeof parsePRD> | null;
  mr: ReturnType<typeof parseMarketResearch> | null;
  prototype: Prototype | null;
  documentation: Documentation | null;
  hasPRDFile: boolean;
  hasMRFile: boolean;
  hasPrototypeFiles: boolean;
}

export default function TabsContent({
  experiment,
  prd,
  mr,
  prototype,
  documentation,
  hasPRDFile,
  hasMRFile,
  hasPrototypeFiles,
}: TabsContentProps) {
  const tabs = [];

  // Overview Tab (always shown)
  tabs.push({
    id: "overview",
    label: "Overview",
    content: (
      <div className="rounded-lg border border-border bg-background-secondary p-6 space-y-8">
        <h1 className="text-2xl font-semibold text-text-primary mb-8">Overview</h1>
        {/* Scores Section */}
        {experiment.scores && (
          <div>
            <h2 className="mb-4 text-xl font-semibold text-text-primary">
              Experiment Scores
            </h2>
            <div className="grid grid-cols-5 gap-4">
              <ScoreCard
                value={experiment.scores.businessOpportunity}
                label="B"
                fullName="Business Opportunity"
                rationale={
                  experiment.scoreRationale?.businessOpportunity ??
                  (mr ? (
                    <>
                      Market opportunity with TAM of {mr.tam || "N/A"} and SAM of {mr.sam || "N/A"}.
                      {mr.executiveSummary && (mr.executiveSummary.includes("niche") || mr.executiveSummary.includes("underserved"))
                        ? " Strong niche demand identified in market research."
                        : " Market research indicates viable opportunity."}
                    </>
                  ) : null)
                }
              />
              <ScoreCard
                value={experiment.scores.personalImpact}
                label="P"
                fullName="Personal Impact"
                rationale={
                  experiment.scoreRationale?.personalImpact ??
                  (experiment.scores.personalImpact >= 4
                    ? "High personal value - addresses specific needs identified in the experiment statement."
                    : "Moderate personal value based on experiment goals.")
                }
              />
              <ScoreCard
                value={experiment.scores.competitiveAdvantage}
                label="C"
                fullName="Competitive Advantage"
                rationale={
                  experiment.scores.competitiveAdvantage >= 4
                    ? "Unique positioning identified in market research with first-mover potential."
                    : "Moderate competitive positioning in the market."
                }
              />
              <ScoreCard
                value={experiment.scores.platformCost}
                label="$"
                fullName="Platform Cost"
                rationale={
                  experiment.scores.platformCost >= 4
                    ? "Low complexity - straightforward implementation requirements."
                    : "Moderate to high complexity - requires significant technical infrastructure."
                }
              />
              <ScoreCard
                value={experiment.scores.socialImpact}
                label="S"
                fullName="Social Impact"
                rationale={
                  experiment.scoreRationale?.socialImpact ??
                  (experiment.scores.socialImpact >= 4
                    ? "High social value - addresses meaningful needs and serves underserved communities."
                    : "Moderate social value based on target market and use cases.")
                }
              />
            </div>
          </div>
        )}
      </div>
    ),
  });

  // Market Research Tab
  if (mr) {
    tabs.push({
      id: "market-research",
      label: "Market Research",
      content: (
        <div className="rounded-lg border border-border bg-background-secondary p-6 space-y-8">
          <h1 className="text-2xl font-semibold text-text-primary mb-8">Market Research</h1>
          {/* Market Size Metrics */}
          <div>
            <h2 className="mb-4 text-3xl font-semibold text-text-primary">
              Market Size
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
              <MetricCard label="TAM" value={mr.tam || "N/A"} description="Total Addressable Market" note={mr.tamDesc} />
              <MetricCard label="SAM" value={mr.sam || "N/A"} description="Serviceable Addressable Market" note={mr.samDesc} />
              <MetricCard label="SOM · Year 1" value={mr.somYear1 || "N/A"} description="Serviceable Obtainable Market" />
              <MetricCard label="SOM · Year 2" value={mr.somYear2 || "N/A"} description="Serviceable Obtainable Market" />
              <MetricCard label="SOM · Year 3" value={mr.somYear3 || mr.som || "N/A"} description="Serviceable Obtainable Market" />
            </div>
          </div>

          {/* Executive Summary */}
          {mr.executiveSummary && (
            <div>
              <h2 className="mb-4 text-3xl font-semibold text-text-primary">
                Executive Summary
              </h2>
              <div className="prose prose-sm max-w-none text-text-secondary">
                <MarkdownContent content={mr.executiveSummary} />
              </div>
            </div>
          )}

          {/* Go/No-Go Recommendation */}
          {mr.goNoGo && (
            <div>
              <h2 className="mb-4 text-3xl font-semibold text-text-primary">
                Recommendation
              </h2>
              <div className="rounded-lg border-2 border-accent-primary/40 bg-background-tertiary p-6">
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-lg font-semibold text-accent-primary">
                    Go/No-Go Recommendation
                  </span>
                </div>
                <div className="prose prose-sm max-w-none text-text-secondary">
                  <MarkdownContent content={mr.goNoGo} />
                </div>
              </div>
            </div>
          )}
        </div>
      ),
    });
  }

  // PRD Tab
  if (prd) {
    tabs.push({
      id: "prd",
      label: "PRD",
      content: (
        <div className="rounded-lg border border-border bg-background-secondary p-6 space-y-8">
          <h1 className="text-2xl font-semibold text-text-primary mb-8">PRD</h1>
          {prd.overview && (
            <div>
              <h2 className="mb-4 text-3xl font-semibold text-text-primary">Overview</h2>
              <div className="prose prose-sm max-w-none text-text-secondary">
                <MarkdownContent content={prd.overview} />
              </div>
            </div>
          )}
          {prd.problemStatement && (
            <div>
              <h2 className="mb-4 text-3xl font-semibold text-text-primary">
                Problem Statement
              </h2>
              <div className="prose prose-sm max-w-none text-text-secondary">
                <MarkdownContent content={prd.problemStatement} />
              </div>
            </div>
          )}
          {prd.goals && (
            <div>
              <h2 className="mb-4 text-3xl font-semibold text-text-primary">
                Goals & Objectives
              </h2>
              <div className="prose prose-sm max-w-none text-text-secondary">
                <MarkdownContent content={prd.goals} />
              </div>
            </div>
          )}
          {prd.targetUser && (
            <div>
              <h2 className="mb-4 text-3xl font-semibold text-text-primary">Target User</h2>
              <div className="prose prose-sm max-w-none text-text-secondary">
                <MarkdownContent content={prd.targetUser} />
              </div>
            </div>
          )}
          {prd.coreFeatures && (
            <div>
              <h2 className="mb-4 text-3xl font-semibold text-text-primary">Core Features</h2>
              <div className="prose prose-sm max-w-none text-text-secondary">
                <MarkdownContent content={prd.coreFeatures} />
              </div>
            </div>
          )}
          {prd.userStories && (
            <div>
              <h2 className="mb-4 text-3xl font-semibold text-text-primary">User Stories</h2>
              <div className="prose prose-sm max-w-none text-text-secondary">
                <MarkdownContent content={prd.userStories} />
              </div>
            </div>
          )}
          {prd.technicalRequirements && (
            <div>
              <h2 className="mb-4 text-3xl font-semibold text-text-primary">
                Technical Requirements
              </h2>
              <div className="prose prose-sm max-w-none text-text-secondary">
                <MarkdownContent content={prd.technicalRequirements} />
              </div>
            </div>
          )}
          {prd.successMetrics && (
            <div>
              <h2 className="mb-4 text-3xl font-semibold text-text-primary">
                Success Metrics
              </h2>
              <div className="prose prose-sm max-w-none text-text-secondary">
                <MarkdownContent content={prd.successMetrics} />
              </div>
            </div>
          )}
          {prd.validationPlan && (
            <div>
              <h2 className="mb-4 text-3xl font-semibold text-text-primary">
                Validation Plan (Landing Page)
              </h2>
              <div className="prose prose-sm max-w-none text-text-secondary">
                <MarkdownContent content={prd.validationPlan} />
              </div>
            </div>
          )}
        </div>
      ),
    });
  }

  // Landing Page Tab (if PRD exists)
  if (hasPRDFile) {
    tabs.push({
      id: "landing",
      label: "Landing Page",
      content: (
        <div className="rounded-lg border border-border bg-background-secondary p-6 space-y-8">
          <h1 className="text-2xl font-semibold text-text-primary mb-8">Landing Page Validation</h1>
          
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <section className="rounded-lg border border-border bg-background-tertiary p-6">
                <h2 className="mb-4 text-xl font-semibold text-text-primary">Status</h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-text-secondary">Current Status:</span>
                    <ValidationStatusBadge status={experiment.validation?.status} />
                  </div>
                  {experiment.validation?.url && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-text-secondary">Landing URL:</span>
                      <a 
                        href={experiment.validation.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-accent-primary hover:underline text-sm"
                      >
                        {experiment.validation.url}
                      </a>
                    </div>
                  )}
                  {experiment.validation?.devPort && (
                    <LandingPageLink devPort={experiment.validation.devPort} />
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-border bg-background-tertiary p-6">
                <h2 className="mb-4 text-xl font-semibold text-text-primary">Reference</h2>
                <p className="mb-4 text-sm text-text-secondary">
                  Landing page copy, structure, and form fields:{" "}
                  <Link
                    href={`/experiments/${slugify(experiment.name)}/doc/landing-page-content`}
                    className="text-accent-primary hover:underline"
                  >
                    Landing Page Content
                  </Link>
                </p>
                <h2 className="mb-4 text-xl font-semibold text-text-primary">Next Steps</h2>
                <div className="space-y-2 text-sm text-text-secondary">
                  {!experiment.validation?.status || experiment.validation.status === 'not_started' ? (
                    <>
                      <p>1. Review the Validation Plan in your PRD</p>
                      <p>2. Build a simple landing page for ad validation</p>
                      <p>3. Connect to the shared Notion database for responses</p>
                      <p>4. Update experiment status to &quot;planned&quot; or &quot;live&quot;</p>
                    </>
                  ) : experiment.validation.status === 'planned' ? (
                    <>
                      <p>1. Deploy your landing page</p>
                      <p>2. Set up traffic sources (ads, social, etc.)</p>
                      <p>3. Update status to &quot;live&quot; when ready</p>
                    </>
                  ) : experiment.validation.status === 'live' ? (
                    <>
                      <p>1. Monitor responses in Notion</p>
                      <p>2. Analyze conversion rates</p>
                      <p>3. Mark as &quot;complete&quot; when validation is done</p>
                    </>
                  ) : (
                    <p>Validation complete! Review results in Notion.</p>
                  )}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-lg border border-border bg-background-tertiary p-6">
                <h2 className="mb-4 text-xl font-semibold text-text-primary">Notion Integration</h2>
                <div className="space-y-3 text-sm text-text-secondary">
                  <p>Responses are stored in a shared Notion database with these fields:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Experiment</strong> - Which experiment this belongs to</li>
                    <li><strong>Email</strong> - Contact info from form</li>
                    <li><strong>Opted In</strong> - Whether they signed up</li>
                    <li><strong>Opt-Out Reason</strong> - Why they passed</li>
                    <li><strong>Source</strong> - Traffic channel (ad, social, etc.)</li>
                    <li><strong>Timestamp</strong> - When submitted</li>
                  </ul>
                </div>
              </section>

              {prd?.validationPlan && (
                <section className="rounded-lg border border-border bg-background-tertiary p-6">
                  <h2 className="mb-4 text-xl font-semibold text-text-primary">Validation Plan Summary</h2>
                  <div className="prose prose-sm max-w-none text-text-secondary">
                    <MarkdownContent content={prd.validationPlan} />
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      ),
    });
  }

  // Details Tab
  tabs.push({
    id: "details",
    label: "Details",
    content: (
      <div className="rounded-lg border border-border bg-background-secondary p-6 space-y-8">
        <h1 className="text-2xl font-semibold text-text-primary mb-8">Details</h1>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Experiment Details */}
            <section className="rounded-lg border border-border bg-background-secondary p-6">
              <h2 className="mb-4 text-3xl font-semibold text-text-primary">
                Experiment Details
              </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-text-secondary">Status</dt>
                <dd className="mt-1">
                  <StatusBadge status={experiment.status} />
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-text-secondary">Created</dt>
                <dd className="mt-1 text-sm text-text-primary">
                  {new Date(experiment.createdDate).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-text-secondary">Modified</dt>
                <dd className="mt-1 text-sm text-text-primary">
                  {new Date(experiment.lastModified).toLocaleDateString()}
                </dd>
              </div>
              {experiment.tags.length > 0 && (
                <div>
                  <dt className="text-sm font-medium text-text-secondary">Tags</dt>
                  <dd className="mt-2">
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
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-text-secondary">Directory</dt>
                <dd className="mt-1 font-mono text-sm text-text-primary">
                  {experiment.directory}
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
              <h2 className="mb-4 text-3xl font-semibold text-text-primary">Workflow Status</h2>
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
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Landing Page</span>
                {experiment.validation?.status === 'complete' ? (
                  <span className="text-accent-primary">✓ Complete</span>
                ) : experiment.validation?.status === 'live' ? (
                  <span className="text-green-500">● Live</span>
                ) : experiment.validation?.status === 'planned' ? (
                  <span className="text-yellow-500">○ Planned</span>
                ) : (
                  <span className="text-text-muted">— Not started</span>
                )}
              </div>
            </div>
          </section>

            {/* Documentation Metadata */}
            {documentation && (
              <section className="rounded-lg border border-border bg-background-secondary p-6">
                <h2 className="mb-4 text-3xl font-semibold text-text-primary">Documentation</h2>
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
                <h2 className="mb-4 text-3xl font-semibold text-text-primary">Prototype</h2>
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
                {prototype.port && (
                  <div className="mt-3">
                    <a
                      href={`http://localhost:${prototype.port}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition text-sm font-medium"
                    >
                      Open Prototype →
                      <span className="font-mono text-xs opacity-75">:${prototype.port}</span>
                    </a>
                    <p className="mt-2 text-xs text-text-muted">
                      Make sure the prototype is running: <code className="bg-background-tertiary px-1.5 py-0.5 rounded">npm run dev</code> in the prototype directory
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

            {/* Quick Actions */}
            <section className="rounded-lg border border-border bg-background-secondary p-6">
              <h2 className="mb-4 text-3xl font-semibold text-text-primary">Quick Actions</h2>
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
    ),
  });

  return <Tabs tabs={tabs} defaultTab="overview" />;
}

