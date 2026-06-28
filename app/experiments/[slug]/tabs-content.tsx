"use client";

import { useState } from "react";
import MarkdownContent from "@/components/MarkdownContent";
import ScoreCard from "@/components/ScoreCard";
import MetricCard from "@/components/MetricCard";
import { Experiment } from "@/types";
import type { parsePRD, parseMarketResearch } from "@/lib/data";
import type { OpenSpecLifecycle } from "@/lib/openspec-shared";
import { formatBhdPhaseLabel, isBhdPhaseTab } from "@/lib/openspec-shared";

interface TabsContentProps {
  experiment: Experiment;
  prd: ReturnType<typeof parsePRD> | null;
  prdRawContent: string | null;
  mr: ReturnType<typeof parseMarketResearch> | null;
  businessCaseContent: string | null;
  openSpecLifecycle: OpenSpecLifecycle | null;
  isEditor: boolean;
  activeTab: string;
  slug: string;
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

function EditableTab({
  contentType,
  slug,
  initialContent,
  children,
  isEditor,
}: {
  contentType: "prd" | "business_case";
  slug: string;
  initialContent: string;
  children: React.ReactNode;
  isEditor: boolean;
}) {
  const [editing, setEditing] = useState(isEditor);
  const [draft, setDraft] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/experiments/${slug}/content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: contentType, content: draft }),
      });
      if (!res.ok) throw new Error("Save failed");
      setEditing(false);
    } catch {
      setError("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {isEditor && (
        <div className="flex items-center gap-3 mb-6">
          {editing ? (
            <>
              <button
                onClick={save}
                disabled={saving}
                className="px-3 py-1.5 text-xs font-medium bg-accent-primary text-white rounded hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setDraft(initialContent);
                  setError(null);
                }}
                className="px-3 py-1.5 text-xs font-medium text-text-dark-secondary hover:text-text-dark"
              >
                Cancel
              </button>
              {error && <span className="text-xs text-red-500">{error}</span>}
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 text-xs font-medium border border-border-dark text-text-dark-secondary rounded hover:text-text-dark hover:border-text-dark"
            >
              Edit
            </button>
          )}
        </div>
      )}

      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full min-h-[70vh] font-mono text-sm p-4 border border-border-dark rounded bg-white text-text-dark focus:outline-none focus:ring-1 focus:ring-accent-primary resize-y"
        />
      ) : (
        children
      )}
    </div>
  );
}

export default function TabsContent({
  experiment,
  prd,
  prdRawContent,
  mr,
  businessCaseContent,
  openSpecLifecycle,
  isEditor,
  activeTab,
  slug,
}: TabsContentProps) {
  if (openSpecLifecycle && isBhdPhaseTab(activeTab)) {
    const artifact = openSpecLifecycle.artifacts.find(
      (a) => a.phase === activeTab,
    );
    if (!artifact) {
      return null;
    }

    return (
      <div className="space-y-4">
        <p className="text-sm text-text-dark-secondary">
          OpenSpec change{" "}
          <code className="bg-background-mint px-1.5 py-0.5 rounded text-xs">
            openspec/changes/{openSpecLifecycle.changeId}/
          </code>{" "}
          · schema {openSpecLifecycle.schema}
        </p>
        <div className="border border-border-dark rounded-lg overflow-hidden">
          <div className="bg-[#194b31] px-4 py-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">
              {formatBhdPhaseLabel(activeTab)}
            </h2>
            {activeTab === openSpecLifecycle.currentPhase && (
              <span className="text-xs text-accent-primary font-medium">
                Current phase
              </span>
            )}
          </div>
          <div className="p-4 prose prose-sm max-w-none text-text-dark-secondary">
            <MarkdownContent content={artifact.content} variant="light" />
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === "business-case" && businessCaseContent?.trim()) {
    return (
      <EditableTab
        contentType="business_case"
        slug={slug}
        initialContent={businessCaseContent}
        isEditor={isEditor}
      >
        <div className="prose prose-sm max-w-none text-text-dark-secondary">
          <MarkdownContent content={businessCaseContent} variant="light" />
        </div>
      </EditableTab>
    );
  }

  if (activeTab === "prd" && prdRawContent?.trim()) {
    return (
      <EditableTab
        contentType="prd"
        slug={slug}
        initialContent={prdRawContent ?? ""}
        isEditor={isEditor}
      >
        <div className="space-y-4">
          {prd?.overview && (
            <Section title="Overview">
              <div className="prose prose-sm max-w-none text-text-dark-secondary">
                <MarkdownContent content={prd.overview} variant="light" />
              </div>
            </Section>
          )}
          {prd?.problemStatement && (
            <Section title="Problem">
              <div className="prose prose-sm max-w-none text-text-dark-secondary">
                <MarkdownContent
                  content={prd.problemStatement}
                  variant="light"
                />
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
          {experiment.scores && experiment.type !== "tool" && (
            <Section title="Scores">
              <div className="grid grid-cols-5 gap-4">
                <ScoreCard
                  value={experiment.scores.businessOpportunity}
                  label="B"
                  fullName="Business Opportunity"
                  rationale={
                    experiment.scoreRationale?.businessOpportunity ??
                    (mr
                      ? `TAM ${mr.tam || "N/A"}, SAM ${mr.sam || "N/A"}`
                      : null)
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
                <MarkdownContent
                  content={mr.marketOpportunity}
                  variant="light"
                />
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
      </EditableTab>
    );
  }

  return null;
}
