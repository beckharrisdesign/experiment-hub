"use client";

import Link from "next/link";
import MarkdownContent from "@/components/MarkdownContent";
import LandingPageLink from "@/components/LandingPageLink";
import ScoreCard from "@/components/ScoreCard";
import MetricCard from "@/components/MetricCard";
import ValidationStatusBadge from "@/components/ValidationStatusBadge";
import { slugify } from "@/lib/utils";
import { Experiment } from "@/types";
import type { parsePRD, parseMarketResearch } from "@/lib/data";

interface TabsContentProps {
  experiment: Experiment;
  prd: ReturnType<typeof parsePRD> | null;
  mr: ReturnType<typeof parseMarketResearch> | null;
  hasPRDFile: boolean;
  learningsContent: string | null;
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
    <div className="py-2">
      <h2 className="font-heading text-base font-semibold text-text-dark mb-3">
        {title}
      </h2>
      <div>{children}</div>
    </div>
  );
}

export default function TabsContent({
  experiment,
  prd,
  mr,
  hasPRDFile,
  learningsContent,
  activeTab,
}: TabsContentProps) {
  const tabs = [];

  // Overview tab — all generated content in one view
  tabs.push({
    id: "overview",
    content: (
      <div className="space-y-4">
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

        {/* Market opportunity prose — new slim format */}
        {mr?.marketOpportunity && (
          <Section title="Market opportunity">
            <div className="prose prose-sm max-w-none text-text-dark-secondary">
              <MarkdownContent content={mr.marketOpportunity} variant="light" />
            </div>
          </Section>
        )}

        {/* Competitive landscape — new slim format */}
        {mr?.competitiveLandscape && (
          <Section title="Competitive landscape">
            <div className="prose prose-sm max-w-none text-text-dark-secondary">
              <MarkdownContent
                content={mr.competitiveLandscape}
                variant="light"
              />
            </div>
          </Section>
        )}

        {/* Recommendation — new slim format; falls back to old Go/No-Go sections */}
        {mr?.recommendation && (
          <Section title="Recommendation">
            <div className="prose prose-sm max-w-none text-text-dark-secondary">
              <MarkdownContent content={mr.recommendation} variant="light" />
            </div>
          </Section>
        )}

        {/* PRD sections — folded into overview */}
        {prd?.problemStatement && (
          <Section title="Problem">
            <div className="prose prose-sm max-w-none text-text-dark-secondary">
              <MarkdownContent content={prd.problemStatement} variant="light" />
            </div>
          </Section>
        )}

        {prd?.goals && (
          <Section title="Goals">
            <div className="prose prose-sm max-w-none text-text-dark-secondary">
              <MarkdownContent content={prd.goals} variant="light" />
            </div>
          </Section>
        )}

        {prd?.targetUser && (
          <Section title="Target user">
            <div className="prose prose-sm max-w-none text-text-dark-secondary">
              <MarkdownContent content={prd.targetUser} variant="light" />
            </div>
          </Section>
        )}

        {prd?.coreFeatures && (
          <Section title="Core features">
            <div className="prose prose-sm max-w-none text-text-dark-secondary">
              <MarkdownContent content={prd.coreFeatures} variant="light" />
            </div>
          </Section>
        )}

        {prd?.successMetrics && (
          <Section title="Success metrics">
            <div className="prose prose-sm max-w-none text-text-dark-secondary">
              <MarkdownContent content={prd.successMetrics} variant="light" />
            </div>
          </Section>
        )}

        {prd?.validationPlan && (
          <Section title="Validation plan">
            <div className="prose prose-sm max-w-none text-text-dark-secondary">
              <MarkdownContent content={prd.validationPlan} variant="light" />
            </div>
          </Section>
        )}

        {/* Learnings */}
        {learningsContent ? (
          <Section title="Learnings">
            <div className="prose prose-sm max-w-none text-text-dark-secondary">
              <MarkdownContent content={learningsContent} variant="light" />
            </div>
          </Section>
        ) : (
          <Section title="Learnings">
            <p className="text-sm text-text-dark-secondary italic">
              No learnings yet.{" "}
              <span className="not-italic">
                Add a{" "}
                <code className="bg-background-mint px-1.5 py-0.5 rounded text-xs not-italic">
                  docs/learnings.md
                </code>{" "}
                file to capture what you discover through prototyping and
                testing.
              </span>
            </p>
          </Section>
        )}

        {/* Empty state */}
        {!mr && !experiment.scores && !prd && (
          <div className="rounded-lg border border-border-dark bg-white px-6 py-10 text-center">
            <p className="text-sm text-text-dark-secondary">
              No research or PRD yet.
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

  // Landing Page tab — validation workflow
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

  const activeContent =
    tabs.find((t) => t.id === activeTab)?.content ?? tabs[0]?.content;
  return <>{activeContent}</>;
}
