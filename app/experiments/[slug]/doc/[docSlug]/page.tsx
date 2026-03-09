import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getExperimentBySlug,
  readExperimentDoc,
} from "@/lib/data";
import MarkdownContent from "@/components/MarkdownContent";
import Header from "@/components/Header";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

const ALLOWED_DOCS = ["landing-page-content"] as const;

export default async function ExperimentDocPage({
  params,
}: {
  params: Promise<{ slug: string; docSlug: string }>;
}) {
  const { slug, docSlug } = await params;
  if (!ALLOWED_DOCS.includes(docSlug as (typeof ALLOWED_DOCS)[number])) {
    notFound();
  }
  const experiment = await getExperimentBySlug(slug);
  if (!experiment) notFound();
  const content = await readExperimentDoc(experiment.directory, docSlug);
  if (!content) notFound();

  const title =
    docSlug === "landing-page-content"
      ? "Landing Page Content"
      : docSlug;

  return (
    <div className="min-h-screen bg-background-primary">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3 text-sm text-text-secondary">
          <Link
            href={`/experiments/${slug}#landing`}
            className="text-accent-primary hover:underline"
          >
            ← {experiment.name}
          </Link>
          <span>/</span>
          <span className="text-text-primary">{title}</span>
        </div>
        <article className="rounded-lg border border-border bg-background-secondary p-6">
          <h1 className="mb-6 text-2xl font-semibold text-text-primary">
            {title}
          </h1>
          <div className="prose prose-sm max-w-none text-text-secondary">
            <MarkdownContent content={content} />
          </div>
        </article>
      </main>
    </div>
  );
}
