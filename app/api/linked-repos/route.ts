import { NextRequest, NextResponse } from "next/server";
import { requireAdminCookie } from "@/lib/admin-auth";
import { getLinkedRepos, createLinkedRepo } from "@/lib/supabase";

export async function GET() {
  if (!(await requireAdminCookie())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const linkedRepos = await getLinkedRepos();
  return NextResponse.json(linkedRepos);
}

export async function POST(request: NextRequest) {
  if (!(await requireAdminCookie())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, repo_slug, description } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  if (!repo_slug || typeof repo_slug !== "string") {
    return NextResponse.json({ error: "repo_slug required" }, { status: 400 });
  }
  if (
    description !== undefined &&
    description !== null &&
    typeof description !== "string"
  ) {
    return NextResponse.json(
      { error: "description must be a string" },
      { status: 400 },
    );
  }

  const linkedRepo = await createLinkedRepo({
    name,
    repo_slug,
    description: description as string | null | undefined,
  });
  return NextResponse.json(linkedRepo, { status: 201 });
}
