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
import { summarizeExperimentScore } from "@/lib/scoring";
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

// Thresholds are fractions of the shape's max so v3 (/15) and v1 (/25) rows
// color consistently; 0.8/0.6/0.4 reproduce v1's old 20/15/10 breakpoints.
function getTotalBadgeColor(total: number, max: number) {
  const fraction = total / max;
  if (fraction >= 0.8) return "bg-green-600 border-green-500 text-white";
  if (fraction >= 0.6) return "bg-yellow-500/80 border-yellow-400/80 text-white";
  if (fraction >= 0.4) return "bg-orange-500/80 border-orange-400/80 text-white";
  return "bg-red-500/80 border-red-400/80 text-white";
}

/** One impact sub-score cell; v1-only and unscored rows show a dash. */
function SubScoreCell({ value }: { value: number | undefined }) {
  return value !== undefined ? (
    <span className="inline-flex items-center justify-center rounded bg-background-active px-2 py-1 text-xs font-semibold text-text-dark">
      {value}
    </span>
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
        headerTooltip:
          "Impact score (PI+SI+BI, 3-15); v1 rows show their historical 5-25 total. Click to sort.",
        compact: true,
        // Fraction of max so v3 (/15) and v1 (/25) rows sort comparably.
        sortValue: (e) => {
          const summary = summarizeExperimentScore(e);
          return summary ? summary.total / summary.max : 0;
        },
        render: (experiment) => {
          const summary = summarizeExperimentScore(experiment);
          if (summary === null) {
            return <span className="text-sm text-text-dark-secondary">—</span>;
          }
          const { total, max, shape } = summary;
          const experimentSlug = getExperimentHrefSlug(experiment);
          const tooltip =
            shape === "impact"
              ? `${total}/15 across Personal, Social, and Business impact.`
              : `${total}/25 · v1 rubric (historical five dimensions).`;
          return (
            <Tooltip content={tooltip} position="top">
              <Link
                href={`/experiments/${experimentSlug}`}
                data-analytics-event="experiment_score_click"
                data-analytics-surface="hub-home"
                data-analytics-experiment={experimentSlug}
                data-analytics-label={String(total)}
                className={`inline-flex items-center justify-center h-7 min-w-[2rem] rounded-md border text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity ${getTotalBadgeColor(total, max)}`}
              >
                {total}
              </Link>
            </Tooltip>
          );
        },
      },
      {
        key: "personal",
        header: "Personal",
        headerTooltip: "Personal Impact (1-5): would I use this?",
        compact: true,
        sortValue: (e) => e.impactScores?.personal ?? 0,
        render: (e) => <SubScoreCell value={e.impactScores?.personal} />,
      },
      {
        key: "social",
        header: "Social",
        headerTooltip: "Social Impact (1-5): does the world need this?",
        compact: true,
        sortValue: (e) => e.impactScores?.social ?? 0,
        render: (e) => <SubScoreCell value={e.impactScores?.social} />,
      },
      {
        key: "business",
        header: "Business",
        headerTooltip:
          "Business Impact (1-5): would the market pay, and could this win?",
        compact: true,
        sortValue: (e) => e.impactScores?.business ?? 0,
        render: (e) => <SubScoreCell value={e.impactScores?.business} />,
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
