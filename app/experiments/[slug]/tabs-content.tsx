"use client";

import MarkdownContent from "@/components/MarkdownContent";
import ScoreCard from "@/components/ScoreCard";
import MetricCard from "@/components/MetricCard";
import { Experiment } from "@/types";
import type { parsePRD, parseMarketResearch } from "@/lib/data";

interface TabsContentProps {
  experiment: Experiment;
  prd: ReturnType<typeof parsePRD> | null;
  mr: ReturnType<typeof parseMarketResearch> | null;
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
    <div className="pt-4 pb-4 border-b border-border-dark last:border-b-0">
      <h2 className="text-sm font-semibold tracking-[0.01em] text-text-dark mb-3">
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
  learningsContent,
  activeTab,
}: TabsContentProps) {
  const tabs = [];

  // Overview tab — all generated content in one view
  tabs.push({
    id: "overview",
    content: (
      <div className="space-y-4">
        {/* Problem, Goals, Target user — product definition first */}
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

        {/* Core features — MVP scope */}
        {prd?.coreFeatures && (
          <Section title="Core features">
            <div className="prose prose-sm max-w-none text-text-dark-secondary">
              <MarkdownContent content={prd.coreFeatures} variant="light" />
            </div>
          </Section>
        )}

        {/* Scores + market analysis — below MVP scope */}
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

        {mr?.marketOpportunity && (
          <Section title="Market opportunity">
            <div className="prose prose-sm max-w-none text-text-dark-secondary">
              <MarkdownContent content={mr.marketOpportunity} variant="light" />
            </div>
          </Section>
        )}

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

        {mr?.recommendation && (
          <Section title="Recommendation">
            <div className="prose prose-sm max-w-none text-text-dark-secondary">
              <MarkdownContent content={mr.recommendation} variant="light" />
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

  const activeContent =
    tabs.find((t) => t.id === activeTab)?.content ?? tabs[0]?.content;
  return <>{activeContent}</>;
}
