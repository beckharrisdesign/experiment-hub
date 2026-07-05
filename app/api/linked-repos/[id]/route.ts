import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getLinkedRepoById,
  updateLinkedRepo,
  deleteLinkedRepo,
} from "@/lib/supabase";

async function requireAdmin() {
  const cookieStore = await cookies();
  const editCookie = cookieStore.get("hub-edit");
  return editCookie?.value === process.env.ADMIN_SECRET;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const linkedRepo = await getLinkedRepoById(id);
  if (!linkedRepo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(linkedRepo);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, description, worktree_path } = body;

  if (name !== undefined && typeof name !== "string") {
    return NextResponse.json(
      { error: "name must be a string" },
      { status: 400 },
    );
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
  if (
    worktree_path !== undefined &&
    worktree_path !== null &&
    typeof worktree_path !== "string"
  ) {
    return NextResponse.json(
      { error: "worktree_path must be a string" },
      { status: 400 },
    );
  }

  const linkedRepo = await updateLinkedRepo(id, {
    name: name as string | undefined,
    description: description as string | null | undefined,
    worktree_path: worktree_path as string | null | undefined,
  });
  return NextResponse.json(linkedRepo);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await deleteLinkedRepo(id);
  return new NextResponse(null, { status: 204 });
}
