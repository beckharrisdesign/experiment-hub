"use client";

import { useState, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Tooltip from "@/components/Tooltip";
import ScoreTable, { type ScoreTableColumn } from "@/components/ScoreTable";
import type { Experiment, Prototype, Documentation } from "@/types";
import { getExperimentHrefSlug } from "@/lib/utils";
import { formatBhdPhaseLabel } from "@/lib/openspec-shared";
import type { BhdPhase } from "@/lib/openspec-shared";
import { calculateTotalScore } from "@/lib/scoring";
import Link from "next/link";

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

interface HomePageClientProps {
  initialExperiments: ExperimentWithRelated[];
}

type ViewTab = "active" | "inactive";

const HIDDEN_EXPERIMENT_IDS = ["experience-principles-repository"];

function getTotalBadgeColor(score: number) {
  if (score >= 20) return "bg-green-600 border-green-500 text-white";
  if (score >= 15) return "bg-yellow-500/80 border-yellow-400/80 text-white";
  if (score >= 10) return "bg-orange-500/80 border-orange-400/80 text-white";
  return "bg-red-500/80 border-red-400/80 text-white";
}

/** ✓ / — cell used by the PRD, Landing and Prototype columns. */
function PresenceCell({ present }: { present: boolean }) {
  return present ? (
    <span className="text-accent-primary">✓</span>
  ) : (
    <span className="text-sm text-text-dark-secondary">—</span>
  );
}

export default function HomePageClient({
  initialExperiments,
}: HomePageClientProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>("active");

  const experiments = useMemo(
    () =>
      initialExperiments.filter((e) => !HIDDEN_EXPERIMENT_IDS.includes(e.id)),
    [initialExperiments],
  );

  const activeExperiments = useMemo(
    () => experiments.filter((e) => e.status !== "Abandoned"),
    [experiments],
  );

  const inactiveExperiments = useMemo(
    () => experiments.filter((e) => e.status === "Abandoned"),
    [experiments],
  );

  const displayedExperiments =
    activeTab === "active" ? activeExperiments : inactiveExperiments;

  const columns = useMemo<ScoreTableColumn<ExperimentWithRelated>[]>(
    () => [
      {
        key: "name",
        header: "Experiment",
        sortValue: (e) => e.name.toLowerCase(),
        render: (experiment) => (
          <Link
            href={`/experiments/${getExperimentHrefSlug(experiment)}`}
            className="block hover:text-accent-primary"
          >
            <span className="font-heading text-xl font-medium text-text-dark inline-flex items-center gap-2 flex-wrap">
              {experiment.name || experiment.id || "Untitled"}
              {/* Admin-only process indicator (gated to edit mode
                  server-side). Dashed + unfilled so it reads as metadata,
                  never as a CTA. */}
              {experiment.openSpecPhase && (
                <span className="text-[11px] font-medium rounded-md border border-dashed border-accent-primary/30 text-accent-primary/70 px-1.5 py-0.5">
                  {formatBhdPhaseLabel(experiment.openSpecPhase)}
                </span>
              )}
            </span>
            <span className="block text-sm text-text-dark-secondary leading-relaxed mt-0.5 line-clamp-1">
              {experiment.statement}
            </span>
          </Link>
        ),
      },
      {
        key: "total",
        header: "Score",
        headerTooltip: "Sum of B+P+C+$+S (5-25). Click to sort.",
        compact: true,
        sortValue: (e) => calculateTotalScore(e.scores) ?? 0,
        render: (experiment) => {
          const total = calculateTotalScore(experiment.scores);
          if (total === null) {
            return <span className="text-sm text-text-dark-secondary">—</span>;
          }
          const experimentSlug = getExperimentHrefSlug(experiment);
          return (
            <Tooltip content={`${total}/25 across five scoring dimensions — see /scoring.`} position="top">
              <Link
                href={`/experiments/${experimentSlug}`}
                data-analytics-event="experiment_score_click"
                data-analytics-surface="hub-home"
                data-analytics-experiment={experimentSlug}
                data-analytics-label={String(total)}
                className={`inline-flex items-center justify-center h-7 min-w-[2rem] rounded-md border text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity ${getTotalBadgeColor(total)}`}
              >
                {total}
              </Link>
            </Tooltip>
          );
        },
      },
      {
        key: "prd",
        header: "PRD",
        headerTooltip: "Product Requirements Document",
        compact: true,
        render: (e) => <PresenceCell present={!!e.hasPRDFile} />,
      },
      {
        key: "landing",
        header: "Landing",
        headerTooltip: "Landing page for validation",
        compact: true,
        render: (e) => <PresenceCell present={!!e.hasLandingPage} />,
      },
      {
        key: "prototype",
        header: "Prototype",
        headerTooltip: "Prototype built",
        compact: true,
        render: (e) => <PresenceCell present={!!e.hasPrototypeDir} />,
      },
    ],
    [],
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="bg-background-primary px-4 md:px-8 lg:px-16 py-12 lg:py-[70px]">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-start max-w-screen-xl mx-auto">
          {/* Large heading — grows on lg so info columns sit on the right */}
          <div className="flex-1 min-w-0 lg:pr-5">
            <h1 className="font-heading text-4xl md:text-5xl lg:text-[60px] font-semibold text-text-primary leading-tight">
              Welcome
              <br />
              to BHD Labs
            </h1>
          </div>
          {/* Info columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:flex lg:flex-row lg:shrink-0 lg:gap-4">
            {/* About column */}
            <div className="lg:w-[204px] lg:pr-4 lg:shrink-0">
              <p className="text-sm font-bold text-white leading-5 mb-2">
                About BHD Labs
              </p>
              <p className="text-sm font-light text-white leading-5">
                I&apos;m a neurodiverse designer and founder. My best ideas come fast and
                from everywhere. This platform is how I develop them with rigor
                and pursue the strongest ones with focus.
              </p>
            </div>
            {/* What drives me column */}
            <div className="lg:w-[204px] lg:pr-4 lg:shrink-0">
              <p className="text-sm font-bold text-white leading-5 mb-2">
                What drives me
              </p>
              <p className="text-sm font-light text-white leading-5">
                I build things I care deeply about, that serve a real market
                need, and that make a difference in the world. I make sure all three are true -- plus a few extras -- in a custom scoring system.
              </p>
            </div>
            {/* Core themes column */}
            <div className="lg:w-[204px] lg:pr-4 lg:shrink-0">
              <p className="text-sm font-bold text-white leading-5 mb-2">
                My core themes
              </p>
              <ul className="text-sm font-light text-white leading-5 space-y-1.5">
                <li>
                  <span className="font-medium">Empowering makers</span> — tools
                  for people who create things with their hands
                </li>
                <li>
                  <span className="font-medium">Supporting neurodiversity</span>{" "}
                  — products designed for how divergent minds actually work
                </li>
                <li>
                  <span className="font-medium">Environmental impact</span> —
                  helping people make more sustainable choices
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Scaffolding Section */}
      {/* <section className="bg-background-secondary px-4 md:px-8 lg:px-16 py-8 border-t border-b border-[rgba(20,174,92,0.2)]">
        <div className="max-w-screen-xl mx-auto">
          <p className="text-xs font-bold text-text-primary uppercase tracking-widest mb-5">
            The scaffolding
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex-1">
              <p className="text-sm font-semibold text-white leading-5 mb-1">
                Workflow
              </p>
              <p className="text-sm font-light text-text-primary leading-5 mb-2">
                The workflow columns below show exactly where each experiment
                stands. A clear picture of what&apos;s in progress makes it easy
                to dive back in with confidence.
              </p>
              <Link
                href="/workflow"
                data-analytics-event="scaffolding_link_click"
                data-analytics-surface="hub-home"
                data-analytics-label="workflow"
                className="text-xs font-medium text-accent-primary hover:underline"
              >
                View workflow →
              </Link>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white leading-5 mb-1">
                Scoring
              </p>
              <p className="text-sm font-light text-text-primary leading-5 mb-2">
                Every experiment is scored across five dimensions after market
                research. Comparing ideas side-by-side makes prioritization
                intentional — I choose what to build next based on evidence, not
                just momentum.
              </p>
              <Link
                href="/scoring"
                data-analytics-event="scaffolding_link_click"
                data-analytics-surface="hub-home"
                data-analytics-label="scoring"
                className="text-xs font-medium text-accent-primary hover:underline"
              >
                View scoring →
              </Link>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white leading-5 mb-1">
                Heuristics
              </p>
              <p className="text-sm font-light text-text-primary leading-5 mb-2">
                Design and product decisions are captured in writing as I build.
                Returning to an experiment weeks later, I can immediately pick
                up the thread — with all my thinking intact.
              </p>
              <Link
                href="/heuristics"
                data-analytics-event="scaffolding_link_click"
                data-analytics-surface="hub-home"
                data-analytics-label="heuristics"
                className="text-xs font-medium text-accent-primary hover:underline"
              >
                View heuristics →
              </Link>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white leading-5 mb-1">
                Harness
              </p>
              <p className="text-sm font-light text-text-primary leading-5 mb-2">
                The AI agents and structures that power the whole system — from
                experiment creation through market research, PRD, design review,
                and prototype.
              </p>
              <Link
                href="/harness"
                data-analytics-event="scaffolding_link_click"
                data-analytics-surface="hub-home"
                data-analytics-label="harness"
                className="text-xs font-medium text-accent-primary hover:underline"
              >
                View harness →
              </Link>
            </div>
          </div>
        </div>
      </section> */}

      {/* Experiment List Section */}
      <section className="bg-background-light px-4 md:px-8 lg:px-16 py-[46px] flex-1">
        <div className="max-w-screen-xl mx-auto">
          <h2 className="font-heading text-base font-semibold text-text-dark mb-4">
            All experiments
          </h2>

          {/* Tabs */}
          <div className="flex">
            <button
              onClick={() => setActiveTab("active")}
              data-analytics-event="hub_filter_toggle"
              data-analytics-surface="hub-home"
              data-analytics-label="active"
              className={`flex items-center h-[51px] px-4 text-[15px] font-medium transition-colors whitespace-nowrap ${
                activeTab === "active"
                  ? "bg-[rgba(20,174,92,0.1)] border-b-[3px] border-accent-primary text-text-dark"
                  : "text-text-dark hover:bg-[rgba(20,174,92,0.05)]"
              }`}
            >
              Active ({activeExperiments.length})
            </button>
            <button
              onClick={() => setActiveTab("inactive")}
              data-analytics-event="hub_filter_toggle"
              data-analytics-surface="hub-home"
              data-analytics-label="inactive"
              className={`flex items-center h-[51px] px-4 text-[15px] font-medium transition-colors whitespace-nowrap ${
                activeTab === "inactive"
                  ? "bg-[rgba(20,174,92,0.1)] border-b-[3px] border-accent-primary text-text-dark"
                  : "text-text-dark hover:bg-[rgba(20,174,92,0.05)]"
              }`}
            >
              Inactive ({inactiveExperiments.length})
            </button>
          </div>

          {/* Table — shared component, also used by the Etsy listing scorecard */}
          <ScoreTable
            rows={displayedExperiments}
            columns={columns}
            rowKey={(e) => e.id}
            defaultSortKey="total"
            defaultSortDirection="desc"
            emptyMessage={
              activeTab === "active"
                ? "No active experiments found."
                : "No inactive experiments."
            }
          />
        </div>
      </section>

      <Footer />
    </div>
  );
}
