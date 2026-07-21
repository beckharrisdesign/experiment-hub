import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ExperimentTypeBadge from "@/components/ExperimentTypeBadge";
import StatusBadge from "@/components/StatusBadge";
import { getExperimentBySlug } from "@/lib/data";
import {
  getExperimentFieldsFromNotion,
  hasNotionExperiments,
  PUBLIC_FIELD_ALLOWLIST,
  type ExperimentField,
} from "@/lib/notion-experiments";
import {
  getHistoryForExperiment,
  hasNotionHistory,
  type HistoryEntry,
} from "@/lib/notion-history";
import { requireAdminCookie } from "@/lib/admin-auth";

// Mark this route as dynamic to ensure it's always rendered on-demand
export const dynamic = "force-dynamic";
export const dynamicParams = true; // Allow any slug, not just pre-generated ones

/** One narrative statement: uppercase label over reading-size prose. */
function Statement({ label, value }: ExperimentField) {
  return (
    <div className="max-w-[720px]">
      <div className="text-xs font-medium uppercase tracking-[0.08em] text-text-dark-secondary">
        {label}
      </div>
      <p className="mt-2 text-lg leading-[1.7] text-text-dark whitespace-pre-wrap">
        {value}
      </p>
    </div>
  );
}

/**
 * The History band: a vertical scan line of dated milestones below the
 * narrative statements. Month dates sit in a fixed 88px mono/tabular gutter
 * (stacked above the sentence on small screens); sentences run on the 720px
 * measure, oldest first. Renders nothing when there are no approved entries.
 */
function History({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <section className="max-w-[720px]">
      <div className="text-xs font-medium uppercase tracking-[0.08em] text-text-dark-secondary">
        History
      </div>
      <ol className="mt-4 flex flex-col gap-4">
        {entries.map((entry) => (
          <li
            key={`${entry.date}-${entry.milestone}`}
            className="flex flex-col sm:flex-row sm:gap-4"
          >
            <span className="w-[88px] shrink-0 font-mono text-[13px] tabular-nums text-text-dark-secondary sm:text-right">
              {entry.month}
            </span>
            <span className="text-sm leading-[1.7] text-text-dark">
              {entry.milestone}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Admin-only empty slot prompting Katy to fill a missing statement. */
function GhostPrompt({ label }: { label: string }) {
  return (
    <div className="max-w-[720px] rounded-lg border border-dashed border-border-dark/30 px-4 py-3 text-sm text-text-dark-secondary/70">
      Add {label.toLowerCase()} →
    </div>
  );
}

export default async function ExperimentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const experiment = await getExperimentBySlug(slug);
  if (!experiment) {
    notFound();
  }

  // Admin edit mode (the `hub-edit` cookie) may view private rows and sees
  // ghost prompts; anonymous visitors get neither.
  const editMode = await requireAdminCookie();

  // Private-by-default: a Notion row with Public unchecked (public === false)
  // never renders on a public route. Non-Notion rows (public === undefined)
  // are unaffected. Admin edit mode bypasses the gate so Katy can fill it in.
  if (experiment.public === false && !editMode) {
    notFound();
  }

  const statements = hasNotionExperiments()
    ? ((await getExperimentFieldsFromNotion(slug).catch((error) => {
        console.error(
          `[ExperimentDetailPage] Notion field fetch failed for "${slug}":`,
          error,
        );
        return null;
      })) ?? [])
    : [];

  const history = hasNotionHistory()
    ? ((await getHistoryForExperiment(slug).catch((error) => {
        console.error(
          `[ExperimentDetailPage] Notion history fetch failed for "${slug}":`,
          error,
        );
        return [];
      })) ?? [])
    : [];

  const present = new Set(statements.map((field) => field.label));
  const missing = PUBLIC_FIELD_ALLOWLIST.filter((label) => !present.has(label));
  // The content band renders when there is something to show — real
  // statements, (in edit mode) ghost prompts for what's missing, or approved
  // History entries. When a public page has none of these, the band is dropped
  // entirely and the dark hero stays flush to the footer.
  const showNarrative =
    statements.length > 0 ||
    history.length > 0 ||
    (editMode && missing.length > 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero */}
      <section className="bg-background-primary px-4 md:px-8 lg:px-16 pt-8 pb-10">
        <div className="max-w-screen-xl mx-auto">
          <nav className="mb-4 text-sm">
            <ol className="flex items-center gap-2 text-text-secondary">
              <li>
                <Link
                  href="/"
                  data-analytics-event="navigation_click"
                  data-analytics-surface="hub"
                  data-analytics-label="breadcrumb_experiments"
                  className="hover:text-text-primary transition-colors"
                >
                  Experiments
                </Link>
              </li>
              <li>/</li>
              <li className="text-text-primary">{experiment.name}</li>
            </ol>
          </nav>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-4xl md:text-5xl lg:text-[60px] font-semibold text-text-primary leading-tight">
              {experiment.name}
            </h1>
            <ExperimentTypeBadge type={experiment.type} />
            <StatusBadge status={experiment.status} />
          </div>
          {experiment.statement && (
            <p className="mt-2 text-sm text-text-secondary">
              {experiment.statement}
            </p>
          )}
        </div>
      </section>

      {/* Narrative statements (curated allowlist only) */}
      {showNarrative && (
        <main className="flex-1 bg-background-light px-4 md:px-8 lg:px-16 py-12">
          <div className="max-w-screen-xl mx-auto flex flex-col gap-8">
            {statements.map((field) => (
              <Statement key={field.label} {...field} />
            ))}
            {editMode &&
              missing.map((label) => <GhostPrompt key={label} label={label} />)}
            <History entries={history} />
          </div>
        </main>
      )}
      {/* All statements empty on a public page: no content band — keep the
          dark hero flush to the footer instead of a bare gap. */}
      {!showNarrative && <div className="flex-1 bg-background-primary" />}

      <Footer />
    </div>
  );
}
