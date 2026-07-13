import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ExperimentTypeBadge from "@/components/ExperimentTypeBadge";
import { getExperimentBySlug } from "@/lib/data";
import {
  getExperimentFieldsFromNotion,
  hasNotionExperiments,
  type ExperimentField,
} from "@/lib/notion-experiments";
import type { Experiment } from "@/types";

// Mark this route as dynamic to ensure it's always rendered on-demand
export const dynamic = "force-dynamic";
export const dynamicParams = true; // Allow any slug, not just pre-generated ones

const SCORE_LABELS: Record<string, string> = {
  "Score:B": "Business Opportunity",
  "Score:P": "Personal Impact",
  "Score:C": "Competitive Advantage",
  "Score:D": "Platform Cost",
  "Score:S": "Social Impact",
};

/** Fallback when the experiment isn't in Notion: fields from the hub record. */
function buildFieldsFromExperiment(experiment: Experiment): ExperimentField[] {
  const fields: ExperimentField[] = [
    { label: "Status", value: experiment.status },
    {
      label: "Type",
      value: experiment.type
        ? experiment.type[0].toUpperCase() + experiment.type.slice(1)
        : "",
    },
    { label: "Slug", value: experiment.id },
    { label: "Directory", value: experiment.directory },
    { label: "Tags", value: experiment.tags.join(", ") },
    { label: "Created", value: experiment.createdDate },
    { label: "Last modified", value: experiment.lastModified },
  ];
  if (experiment.scores) {
    fields.push(
      { label: "Business Opportunity", value: String(experiment.scores.businessOpportunity) },
      { label: "Personal Impact", value: String(experiment.scores.personalImpact) },
      { label: "Competitive Advantage", value: String(experiment.scores.competitiveAdvantage) },
      { label: "Platform Cost", value: String(experiment.scores.platformCost) },
      { label: "Social Impact", value: String(experiment.scores.socialImpact) },
    );
  }
  return fields.filter((field) => field.value);
}

function FieldValue({ value }: { value: string }) {
  if (/^https?:\/\/\S+$/.test(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent-secondary underline underline-offset-2 hover:text-accent-primary break-all"
      >
        {value}
      </a>
    );
  }
  return <span className="whitespace-pre-wrap">{value}</span>;
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

  const notionFields = hasNotionExperiments()
    ? await getExperimentFieldsFromNotion(slug).catch((error) => {
        console.error(
          `[ExperimentDetailPage] Notion field fetch failed for "${slug}"; falling back to hub fields:`,
          error,
        );
        return null;
      })
    : null;
  const fields = notionFields ?? buildFieldsFromExperiment(experiment);

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
          </div>
          {experiment.statement && (
            <p className="mt-2 text-sm text-text-secondary">
              {experiment.statement}
            </p>
          )}
        </div>
      </section>

      {/* Fields */}
      <main className="flex-1 bg-background-light px-4 md:px-8 lg:px-16 py-12">
        <div className="max-w-screen-xl mx-auto">
          {fields.length === 0 ? (
            <p className="text-sm text-text-dark-secondary">
              No details recorded for this experiment yet.
            </p>
          ) : (
            <dl className="divide-y divide-border-dark/15">
              {fields.map((field) => (
                <div
                  key={field.label}
                  className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-1 md:gap-8 py-4"
                >
                  <dt className="text-xs font-medium uppercase tracking-[0.08em] text-text-dark-secondary md:pt-0.5">
                    {SCORE_LABELS[field.label] ?? field.label}
                  </dt>
                  <dd className="text-sm text-text-dark leading-relaxed">
                    <FieldValue value={field.value} />
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
