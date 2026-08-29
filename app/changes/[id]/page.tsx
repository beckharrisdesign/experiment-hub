import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
  return <ChangePageView page={page} />;
}
