import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { loadChangePage, listChangeIds } from "@/lib/change-visualizer";
import ChangePageView from "@/components/change-visualizer/ChangePageView";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  return { title: `${id} — change` };
}

export async function generateStaticParams() {
  return (await listChangeIds()).map((id) => ({ id }));
}

export default async function ChangeRoute({ params }: Params) {
  const { id } = await params;
  const page = await loadChangePage(id);
  if (!page) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-background-primary">
      <Header />
      <nav aria-label="Breadcrumb" className="px-4 pt-8 md:px-8 lg:px-16">
        <ol className="flex items-center gap-2 text-sm text-text-secondary">
          <li>
            <Link href="/changes" className="transition-colors hover:text-text-primary">
              Changes
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-text-primary">{page.id}</li>
        </ol>
      </nav>
      <main className="flex-1">
        <ChangePageView page={page} />
      </main>
      <Footer />
    </div>
  );
}
