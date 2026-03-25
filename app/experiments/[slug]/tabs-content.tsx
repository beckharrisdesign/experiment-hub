"use client";

import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import MarkdownContent from "@/components/MarkdownContent";
import LandingPageLink from "@/components/LandingPageLink";
import ScoreCard from "@/components/ScoreCard";
import MetricCard from "@/components/MetricCard";
import ValidationStatusBadge from "@/components/ValidationStatusBadge";
import { slugify } from "@/lib/utils";
import { Experiment, Prototype, Documentation } from "@/types";
import type { parsePRD, parseMarketResearch } from "@/lib/data";

interface TabsContentProps {
  experiment: Experiment;
  prd: ReturnType<typeof parsePRD> | null;
  mr: ReturnType<typeof parseMarketResearch> | null;
  prototype: Prototype | null;
  documentation: Documentation | null;
  hasPRDFile: boolean;
  hasMRFile: boolean;
  hasPrototypeFiles: boolean;
  activeTab: string;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border-dark bg-white overflow-hidden">
      <div className="px-6 py-3 border-b border-border-dark">
        <h2 className="font-heading text-base font-semibold text-text-dark">
          {title}
        </h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
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
  activeTab,
}: TabsContentProps) {
  const tabs = [];

  // Overview tab — scores + market research combined
  tabs.push({
    id: "overview",
    content: (
      <div className="space-y-4">
        {/* Executive summary */}
        {mr?.executiveSummary && (
          <Section title="Summary">
            <div className="prose prose-sm max-w-none text-text-dark-secondary">
              <MarkdownContent content={mr.executiveSummary} variant="light" />
            </div>
          </Section>
        )}

        {/* Market size */}
        {mr && (
          <Section title="Market size">
            <div className="grid grid-cols-5 gap-3">
              <MetricCard
                label="TAM"
                value={mr.tam || "N/A"}
                description="Total Addressable"
                note={mr.tamDesc ?? undefined}
              />
              <MetricCard
                label="SAM"
                value={mr.sam || "N/A"}
                description="Serviceable"
                note={mr.samDesc ?? undefined}
              />
              <MetricCard
                label="SOM · Y1"
                value={mr.somYear1 || "N/A"}
                description="Obtainable yr 1"
              />
              <MetricCard
                label="SOM · Y2"
                value={mr.somYear2 || "N/A"}
                description="Obtainable yr 2"
              />
              <MetricCard
                label="SOM · Y3"
                value={mr.somYear3 || mr.som || "N/A"}
                description="Obtainable yr 3"
              />
            </div>
          </Section>
        )}

        {/* Scores */}
        {experiment.scores && (
          <Section title="Scores">
            <div className="grid grid-cols-5 gap-4">
              <ScoreCard
                value={experiment.scores.businessOpportunity}
                label="B"
                fullName="Business Opportunity"
                rationale={
                  experiment.scoreRationale?.businessOpportunity ??
                  (mr ? `TAM ${mr.tam || "N/A"}, SAM ${mr.sam || "N/A"}` : null)
                }
              />
              <ScoreCard
                value={experiment.scores.personalImpact}
                label="P"
                fullName="Personal Impact"
                rationale={experiment.scoreRationale?.personalImpact ?? null}
              />
              <ScoreCard
                value={experiment.scores.competitiveAdvantage}
                label="C"
                fullName="Competitive Advantage"
                rationale={null}
              />
              <ScoreCard
                value={experiment.scores.platformCost}
                label="$"
                fullName="Platform Cost"
                rationale={null}
              />
              <ScoreCard
                value={experiment.scores.socialImpact}
                label="S"
                fullName="Social Impact"
                rationale={experiment.scoreRationale?.socialImpact ?? null}
              />
            </div>
          </Section>
        )}

        {/* Go/No-Go */}
        {mr?.goNoGo && (
          <Section title="Recommendation">
            <div className="prose prose-sm max-w-none text-text-dark-secondary">
              <MarkdownContent content={mr.goNoGo} variant="light" />
            </div>
          </Section>
        )}

        {/* Empty state */}
        {!mr && !experiment.scores && (
          <div className="rounded-lg border border-border-dark bg-white px-6 py-10 text-center">
            <p className="text-sm text-text-dark-secondary">
              No market research yet.
            </p>
            <p className="text-xs text-text-dark-secondary mt-1">
              Run{" "}
              <code className="bg-background-mint px-1.5 py-0.5 rounded">
                @market-research
              </code>{" "}
              to get started.
            </p>
          </div>
        )}
      </div>
    ),
  });

  // PRD tab
  if (prd) {
    const prdSections = [
      { title: "Problem Statement", content: prd.problemStatement },
      { title: "Goals & Objectives", content: prd.goals },
      { title: "Target User", content: prd.targetUser },
      { title: "Core Features", content: prd.coreFeatures },
      { title: "User Stories", content: prd.userStories },
      { title: "Technical Requirements", content: prd.technicalRequirements },
      { title: "Success Metrics", content: prd.successMetrics },
      { title: "Validation Plan", content: prd.validationPlan },
    ].filter((s) => s.content);

    tabs.push({
      id: "prd",
      content: (
        <div className="space-y-4">
          {prd.overview && (
            <div className="prose prose-sm max-w-none text-text-dark-secondary px-1">
              <MarkdownContent content={prd.overview} variant="light" />
            </div>
          )}
          {prdSections.map((s) => (
            <Section key={s.title} title={s.title}>
              <div className="prose prose-sm max-w-none text-text-dark-secondary">
                <MarkdownContent content={s.content!} variant="light" />
              </div>
            </Section>
          ))}
        </div>
      ),
    });
  }

  // Landing Page tab
  if (hasPRDFile) {
    tabs.push({
      id: "landing",
      content: (
        <div className="space-y-4">
          <Section title="Status">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-text-dark-secondary">
                  Current status
                </span>
                <ValidationStatusBadge status={experiment.validation?.status} />
              </div>
              {experiment.validation?.url && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-text-dark-secondary">URL</span>
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
          </Section>

          <Section title="Next steps">
            <div className="space-y-1.5 text-sm text-text-dark-secondary">
              {!experiment.validation?.status ||
              experiment.validation.status === "not_started" ? (
                <>
                  <p>
                    1. Review the{" "}
                    <Link
                      href={`/experiments/${slugify(experiment.name)}/doc/landing-page-content`}
                      className="text-accent-primary hover:underline"
                    >
                      Landing Page Content
                    </Link>{" "}
                    doc
                  </p>
                  <p>2. Build a simple landing page for ad validation</p>
                  <p>3. Connect to the shared Notion database for responses</p>
                  <p>
                    4. Update experiment status to{" "}
                    <code className="bg-background-mint px-1 rounded text-xs">
                      planned
                    </code>{" "}
                    or{" "}
                    <code className="bg-background-mint px-1 rounded text-xs">
                      live
                    </code>
                  </p>
                </>
              ) : experiment.validation.status === "planned" ? (
                <>
                  <p>1. Deploy your landing page</p>
                  <p>2. Set up traffic sources (ads, social, etc.)</p>
                  <p>
                    3. Update status to{" "}
                    <code className="bg-background-mint px-1 rounded text-xs">
                      live
                    </code>{" "}
                    when ready
                  </p>
                </>
              ) : experiment.validation.status === "live" ? (
                <>
                  <p>1. Monitor responses in Notion</p>
                  <p>2. Analyse conversion rates</p>
                  <p>
                    3. Mark as{" "}
                    <code className="bg-background-mint px-1 rounded text-xs">
                      complete
                    </code>{" "}
                    when validation is done
                  </p>
                </>
              ) : (
                <p>Validation complete — review results in Notion.</p>
              )}
            </div>
          </Section>

          <Section title="Notion responses">
            <ul className="space-y-1 text-sm text-text-dark-secondary list-disc list-inside">
              <li>
                <strong>Experiment</strong> — which experiment this belongs to
              </li>
              <li>
                <strong>Email</strong> — contact info from form
              </li>
              <li>
                <strong>Opted In</strong> — whether they signed up
              </li>
              <li>
                <strong>Opt-Out Reason</strong> — why they passed
              </li>
              <li>
                <strong>Source</strong> — traffic channel (ad, social, etc.)
              </li>
              <li>
                <strong>Timestamp</strong> — when submitted
              </li>
            </ul>
          </Section>
        </div>
      ),
    });
  }

  // Details tab
  tabs.push({
    id: "details",
    content: (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Left */}
          <div className="space-y-4">
            <Section title="Experiment">
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-text-dark-secondary mb-1">
                    Status
                  </dt>
                  <dd>
                    <StatusBadge status={experiment.status} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-text-dark-secondary mb-1">
                    Created
                  </dt>
                  <dd className="text-sm text-text-dark">
                    {new Date(experiment.createdDate).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-text-dark-secondary mb-1">
                    Modified
                  </dt>
                  <dd className="text-sm text-text-dark">
                    {new Date(experiment.lastModified).toLocaleDateString()}
                  </dd>
                </div>
                {experiment.tags.length > 0 && (
                  <div>
                    <dt className="text-xs text-text-dark-secondary mb-1">
                      Tags
                    </dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {experiment.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-background-mint px-2 py-0.5 text-xs text-text-dark"
                        >
                          {tag}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-text-dark-secondary mb-1">
                    Directory
                  </dt>
                  <dd className="font-mono text-xs text-text-dark">
                    {experiment.directory}
                  </dd>
                </div>
              </dl>
            </Section>

            <Section title="Workflow">
              <div className="space-y-2.5">
                {[
                  { label: "Market Research", done: hasMRFile },
                  { label: "PRD", done: hasPRDFile },
                  {
                    label: "Landing Page",
                    done:
                      experiment.validation?.status === "complete" ||
                      experiment.validation?.status === "live",
                  },
                  { label: "Prototype", done: hasPrototypeFiles },
                ].map(({ label, done }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-text-dark-secondary">{label}</span>
                    {done ? (
                      <span className="text-accent-primary text-xs">
                        ✓ Done
                      </span>
                    ) : (
                      <span className="text-text-dark-secondary text-xs opacity-50">
                        — Not started
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          </div>

          {/* Right */}
          <div className="space-y-4">
            {prototype && (
              <Section title="Prototype">
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-sm text-text-dark">
                      {prototype.title}
                    </p>
                    <p className="text-sm text-text-dark-secondary mt-0.5">
                      {prototype.description}
                    </p>
                  </div>
                  <StatusBadge status={prototype.status} />
                  {prototype.port && (
                    <a
                      href={`http://localhost:${prototype.port}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded hover:opacity-90 transition text-sm font-medium"
                    >
                      Open Prototype →
                      <span className="font-mono text-xs opacity-75">
                        :{prototype.port}
                      </span>
                    </a>
                  )}
                </div>
              </Section>
            )}

            {documentation && (
              <Section title="Documentation">
                <p className="font-medium text-sm text-text-dark">
                  {documentation.title}
                </p>
                <p className="text-xs text-text-dark-secondary mt-1">
                  Last modified:{" "}
                  {new Date(documentation.lastModified).toLocaleDateString()}
                </p>
                {documentation.content && (
                  <p className="text-sm text-text-dark-secondary mt-2">
                    {documentation.content}
                  </p>
                )}
              </Section>
            )}
          </div>
        </div>
      </div>
    ),
  });

  const activeContent =
    tabs.find((t) => t.id === activeTab)?.content ?? tabs[0]?.content;
  return <>{activeContent}</>;
}
