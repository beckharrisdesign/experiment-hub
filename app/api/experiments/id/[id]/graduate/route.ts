import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getLinkedRepoById, graduateExperiment } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const editCookie = cookieStore.get("hub-edit");
  if (!editCookie || editCookie.value !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { linked_repo_id } = body;

  if (!linked_repo_id || typeof linked_repo_id !== "string") {
    return NextResponse.json(
      { error: "linked_repo_id required" },
      { status: 400 },
    );
  }

  const linkedRepo = await getLinkedRepoById(linked_repo_id);
  if (!linkedRepo) {
    return NextResponse.json(
      { error: "Linked repo not found" },
      { status: 404 },
    );
  }

  const experiment = await graduateExperiment(id, linked_repo_id);
  return NextResponse.json(experiment);
}
